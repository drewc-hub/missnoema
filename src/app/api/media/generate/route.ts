// file: src/app/api/media/generate/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating, GenerationType, JobStatus } from "@/lib/db";
import { getMediaCost, getMediaIntensity } from "@/lib/mediaPrompt";

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

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const companionId =
    typeof body?.companionId === "string" ? body.companionId : "";
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  const type = parseType(body?.type);
  const requestedRating = parseRating(body?.contentRating);

  if (!companionId) {
    return NextResponse.json(
      { error: "Missing companionId." },
      { status: 400 },
    );
  }

  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt." }, { status: 400 });
  }

  // Allow any public companion — not just ones owned by this user.
  const companion = await prisma.companion.findFirst({
    where: { id: companionId },
    select: { id: true, contentRating: true },
  });

  if (!companion) {
    return NextResponse.json(
      { error: "Companion not found." },
      { status: 404 },
    );
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

  // Determine coin cost based on trust/intimacy level.
  const conversation = await prisma.conversation.findUnique({
    where: {
      userId_companionId: { userId: user.id, companionId: companion.id },
    },
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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { coinBalance: true },
  });

  if (!dbUser || dbUser.coinBalance < cost) {
    return NextResponse.json({ error: "Not enough coins." }, { status: 402 });
  }

  // Atomically deduct coins and create the job to prevent double-spend races.
  let jobId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
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
          description: `${type === GenerationType.VIDEO ? "Video" : "Image"} generation job`,
        },
      });

      return tx.generationJob.create({
        data: {
          userId: user.id,
          companionId: companion.id,
          type,
          status: JobStatus.PENDING,
          contentRating: effectiveRating,
          prompt,
        },
        select: {
          id: true,
          status: true,
          type: true,
          contentRating: true,
          createdAt: true,
        },
      });
    });
    jobId = result.id;

    return NextResponse.json({
      ok: true,
      jobId,
      status: result.status,
      type: result.type,
      contentRating: result.contentRating,
    });
  } catch {
    return NextResponse.json({ error: "Not enough coins." }, { status: 402 });
  }
}
