// file: src/app/api/media/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { checkBannedThemes, logAudit } from "@/lib/moderation";
import { ContentRating, GenerationType, JobStatus } from "@/lib/db";
import { getMediaCost, getMediaIntensity } from "@/lib/mediaPrompt";
import {
  GENERATION_COOLDOWN_SECONDS,
  DAILY_GENERATION_LIMITS,
} from "@/lib/economy";
import {
  PremiumFeature,
  consumeImageCreditIfAvailable,
  getUserEntitlementsMap,
  hasPremiumFeature,
} from "@/lib/premium";

export const runtime = "nodejs";

function parseType(value: unknown): GenerationType {
  return value === "video" || value === GenerationType.VIDEO
    ? GenerationType.VIDEO
    : GenerationType.IMAGE;
}

function parseRating(value: unknown): ContentRating {
  return value === "ADULT" || value === ContentRating.ADULT
    ? ContentRating.ADULT
    : ContentRating.SAFE;
}

// GET — returns quota info for the current user (cooldown remaining, daily cap)
export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const cooldownSec = GENERATION_COOLDOWN_SECONDS[user.plan];
  const dailyCap = DAILY_GENERATION_LIMITS[user.plan];

  let retryAfterSeconds = 0;
  if (cooldownSec > 0) {
    const cooldownStart = new Date(Date.now() - cooldownSec * 1000);
    const recentJob = await prisma.generationJob.findFirst({
      where: { userId: user.id, createdAt: { gte: cooldownStart } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recentJob) {
      retryAfterSeconds = Math.ceil(
        (recentJob.createdAt.getTime() + cooldownSec * 1000 - Date.now()) / 1000,
      );
    }
  }

  let dailyUsed = 0;
  if (dailyCap !== null) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    dailyUsed = await prisma.generationJob.count({
      where: { userId: user.id, createdAt: { gte: todayStart } },
    });
  }

  return NextResponse.json({
    cooldownSeconds: cooldownSec,
    retryAfterSeconds: Math.max(0, retryAfterSeconds),
    dailyCap,
    dailyUsed,
    dailyRemaining: dailyCap === null ? null : Math.max(0, dailyCap - dailyUsed),
  });
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const companionId =
    typeof body?.companionId === "string" ? body.companionId : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const negativePrompt =
    typeof body?.negativePrompt === "string"
      ? body.negativePrompt.trim().slice(0, 1500)
      : "";
  const type = parseType(body?.type);
  const requestedRating = parseRating(body?.contentRating);
  // Outfit / undress mode: pass an existing asset as Flux Redux reference image
  const sourceAssetId = typeof body?.sourceAssetId === "string" ? body.sourceAssetId.trim() : null;
  const mode = typeof body?.mode === "string" ? body.mode : "standard"; // "standard" | "outfit" | "undress"

  if (!companionId) {
    return NextResponse.json({ error: "Missing companionId." }, { status: 400 });
  }
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const themeCheck = checkBannedThemes(prompt);
  if (themeCheck.blocked) {
    logAudit(user.id, "banned_theme_blocked", { category: themeCheck.category, route: "media_generate" });
    return NextResponse.json({ error: "Prompt contains prohibited content." }, { status: 400 });
  }

  // ── Cooldown check ────────────────────────────────────────────────────────
  const cooldownSec = GENERATION_COOLDOWN_SECONDS[user.plan];
  if (cooldownSec > 0) {
    const cooldownStart = new Date(Date.now() - cooldownSec * 1000);
    const recentJob = await prisma.generationJob.findFirst({
      where: { userId: user.id, createdAt: { gte: cooldownStart } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (recentJob) {
      const retryAfterSeconds = Math.ceil(
        (recentJob.createdAt.getTime() + cooldownSec * 1000 - Date.now()) / 1000,
      );
      return NextResponse.json(
        {
          error: `Please wait ${retryAfterSeconds}s before generating again.`,
          cooldown: true,
          retryAfterSeconds,
        },
        { status: 429 },
      );
    }
  }

  // ── Daily cap check ───────────────────────────────────────────────────────
  const dailyCap = DAILY_GENERATION_LIMITS[user.plan];
  let dailyUsed = 0;
  if (dailyCap !== null) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    dailyUsed = await prisma.generationJob.count({
      where: { userId: user.id, createdAt: { gte: todayStart } },
    });
    if (dailyUsed >= dailyCap) {
      return NextResponse.json(
        {
          error: `Daily generation limit reached (${dailyCap}/day). Upgrade for more.`,
          limitReached: true,
          dailyCap,
          dailyUsed,
        },
        { status: 429 },
      );
    }
  }

  // ── Companion lookup ──────────────────────────────────────────────────────
  const companion = await prisma.companion.findFirst({
    where: { id: companionId },
    select: { id: true, contentRating: true, profile: true },
  });
  if (!companion) {
    return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  }

  const effectiveRating =
    requestedRating === ContentRating.ADULT ||
    companion.contentRating === ContentRating.ADULT
      ? ContentRating.ADULT
      : ContentRating.SAFE;

  if (effectiveRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  const entitlements = await getUserEntitlementsMap(user.id);
  if (
    effectiveRating === ContentRating.ADULT &&
    !hasPremiumFeature(entitlements, PremiumFeature.NSFW_UNLOCKS)
  ) {
    return NextResponse.json(
      { error: "NSFW unlock required." },
      { status: 403 },
    );
  }

  const companionMeta =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : null;
  const premiumOnly = companionMeta?.premiumOnly === true;
  if (
    premiumOnly &&
    !hasPremiumFeature(entitlements, PremiumFeature.PREMIUM_COMPANIONS)
  ) {
    return NextResponse.json(
      { error: "Premium companions pass required." },
      { status: 403 },
    );
  }

  // Undress mode requires adult content + age verification
  if (mode === "undress" && !isAdultAllowed(user)) {
    return NextResponse.json({ error: "Age verification required for this feature." }, { status: 403 });
  }

  // Resolve reference asset URL for outfit/undress mode
  let imagePromptUrl: string | null = null;
  if (sourceAssetId && (mode === "outfit" || mode === "undress")) {
    const sourceAsset = await prisma.companionAsset.findFirst({
      where: { id: sourceAssetId, ownerId: user.id },
      select: { publicUrl: true, id: true },
    });
    if (sourceAsset) {
      imagePromptUrl = sourceAsset.publicUrl ?? `/media/${sourceAsset.id}`;
    }
  }

  // ── Coin cost ─────────────────────────────────────────────────────────────
  const conversation = await prisma.conversation.findUnique({
    where: { userId_companionId: { userId: user.id, companionId: companion.id } },
    select: { trust: true, intimacy: true },
  });

  const intensity = getMediaIntensity({
    trust: conversation?.trust ?? 0,
    intimacy: conversation?.intimacy ?? 0,
    platformMax: 5,
  });

  const cost = getMediaCost(
    intensity,
    type === GenerationType.VIDEO ? "video" : "image",
  );

  const spentImageCredit =
    type === GenerationType.IMAGE
      ? await consumeImageCreditIfAvailable(user.id)
      : false;
  const dbUser = spentImageCredit
    ? null
    : await prisma.user.findUnique({
        where: { id: user.id },
        select: { coinBalance: true },
      });

  if (!spentImageCredit && (!dbUser || dbUser.coinBalance < cost)) {
    return NextResponse.json({ error: "Not enough coins.", coinShortfall: cost - (dbUser?.coinBalance ?? 0) }, { status: 402 });
  }

  // ── Atomic deduct + create job ────────────────────────────────────────────
  let jobId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (!spentImageCredit) {
        const deducted = await tx.user.updateMany({
          where: { id: user.id, coinBalance: { gte: cost } },
          data: { coinBalance: { decrement: cost } },
        });
        if (deducted.count === 0) throw new Error("insufficient_coins");

        await tx.coinTransaction.create({
          data: {
            userId: user.id,
            amount: -cost,
            kind: "spend",
            description: `${type === GenerationType.VIDEO ? "Video" : "Image"} generation`,
          },
        });
      }

      return tx.generationJob.create({
        data: {
          userId: user.id,
          companionId: companion.id,
          type,
          status: JobStatus.PENDING,
          contentRating: effectiveRating,
          prompt,
          negativePrompt: negativePrompt || null,
          requestPreset: imagePromptUrl ?? undefined,
          requestTag: mode !== "standard" ? mode : undefined,
        },
        select: { id: true, status: true, type: true, contentRating: true, createdAt: true },
      });
    });

    jobId = result.id;
    const newDailyUsed = dailyUsed + 1;

    return NextResponse.json({
      ok: true,
      jobId,
      status: result.status,
      type: result.type,
      contentRating: result.contentRating,
      coinCost: spentImageCredit ? 0 : cost,
      imageCreditUsed: spentImageCredit,
      dailyCap,
      dailyUsed: newDailyUsed,
      dailyRemaining: dailyCap === null ? null : Math.max(0, dailyCap - newDailyUsed),
      cooldownSeconds: cooldownSec,
    });
  } catch {
    return NextResponse.json({ error: "Not enough coins." }, { status: 402 });
  }
}
