import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentRating, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { CompanionProfileSchema } from "@/lib/companion-profile";
import { companionCreateInputFromCharacterCard, type CharacterCardV2 } from "@/lib/character-card-v2";
import { checkBannedThemes, logAudit } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { PremiumFeature, hasUserFeature } from "@/lib/premium";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

const ImportSchema = z.object({
  card: z.unknown(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).optional().default("UNLISTED"),
  contentRating: z.enum(["SAFE", "ADULT"]).optional(),
});

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

async function uniqueSlug(base: string) {
  const normalized = normalizeSlug(base) || "imported-companion";
  let slug = normalized;
  let i = 2;

  while (true) {
    const exists = await prisma.companion.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;
    slug = `${normalized}-${i}`;
    i += 1;
  }
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ImportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid import input.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = companionCreateInputFromCharacterCard(parsed.data.card as CharacterCardV2, {
    visibility: parsed.data.visibility,
    contentRating:
      parsed.data.contentRating === "ADULT" ? ContentRating.ADULT : parsed.data.contentRating === "SAFE" ? ContentRating.SAFE : undefined,
  });
  const profile = CompanionProfileSchema.parse(data.profile);

  if (data.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json({ error: "Age verification required." }, { status: 403 });
  }

  const hasCustomPersona = await hasUserFeature(user.id, PremiumFeature.CUSTOM_PERSONAS);
  if (!hasCustomPersona) {
    return NextResponse.json(
      { error: "Custom personas are a premium unlock." },
      { status: 403 },
    );
  }

  if (data.visibility === "PRIVATE") {
    const hasPrivateCompanions = await hasUserFeature(user.id, PremiumFeature.PRIVATE_COMPANIONS);
    if (!hasPrivateCompanions) {
      return NextResponse.json(
        { error: "Private companions require a premium unlock." },
        { status: 403 },
      );
    }
  }

  if (data.contentRating === ContentRating.ADULT) {
    const hasNsfwUnlock = await hasUserFeature(user.id, PremiumFeature.NSFW_UNLOCKS);
    if (!hasNsfwUnlock) {
      return NextResponse.json(
        { error: "NSFW unlock required for adult companions." },
        { status: 403 },
      );
    }
  }

  const textToCheck = [
    data.name,
    data.description,
    profile.personality,
    profile.background,
    profile.scene,
    profile.lore,
  ]
    .filter(Boolean)
    .join(" ");
  const themeCheck = checkBannedThemes(textToCheck);
  if (themeCheck.blocked) {
    logAudit(user.id, "banned_theme_blocked", {
      category: themeCheck.category,
      route: "character_card_v2_import",
    });
    return NextResponse.json(
      { error: "Character card contains prohibited content." },
      { status: 400 },
    );
  }

  const slug = await uniqueSlug(data.slug || data.name);
  const companion = await prisma.companion.create({
    data: {
      ownerId: user.id,
      name: data.name,
      slug,
      description: data.description,
      tags: data.tags,
      archetype: data.archetype,
      visibility: data.visibility as Visibility,
      contentRating: data.contentRating,
      profile: profile as any,
      source: "character-card-v2",
      public: data.visibility === "PUBLIC",
      nsfw: data.contentRating === ContentRating.ADULT,
      scenario: profile.scene || null,
      greeting:
        typeof (parsed.data.card as CharacterCardV2).data?.first_mes === "string"
          ? (parsed.data.card as CharacterCardV2).data?.first_mes ?? null
          : null,
      personalityTags: profile.traits,
      relationshipTags: data.tags.filter((tag) => /romance|flirt|friend|partner|mentor/i.test(tag)),
      kinkTags: profile.nsfwPreferenceTags,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      contentRating: true,
      visibility: true,
    },
  });

  return NextResponse.json({
    ok: true,
    companion,
    viewUrl:
      companion.contentRating === ContentRating.ADULT
        ? `/adult/companions/${companion.slug}`
        : `/companions/${companion.slug}`,
    editUrl:
      companion.contentRating === ContentRating.ADULT
        ? `/adult/companions/${companion.slug}/edit`
        : `/companions/${companion.slug}/edit`,
    chatUrl:
      companion.contentRating === ContentRating.ADULT
        ? `/adult/chat?companion=${companion.slug}`
        : `/chat?companion=${companion.slug}`,
    exportUrl: `/api/companions/${companion.slug}/export/character-card-v2`,
  });
}
