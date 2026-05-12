import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { scoreCompanionMatch } from "@/lib/matchmaking";

export const runtime = "nodejs";

const QuerySchema = z.object({
  includeAdult: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(50).optional().default(16),
});

function addTagWeights(map: Map<string, number>, tags: string[], weight: number) {
  for (const tag of tags) {
    const key = tag.toLowerCase();
    map.set(key, (map.get(key) ?? 0) + weight);
  }
}

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    includeAdult: url.searchParams.get("includeAdult") === "1",
    limit: Number(url.searchParams.get("limit") ?? "16"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query.", details: parsed.error.flatten() }, { status: 400 });
  }

  const includeAdult = parsed.data.includeAdult && isAdultAllowed(user);
  const allowedRatings = includeAdult
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];

  const [reactions, events, conversations] = await Promise.all([
    prisma.companionReaction.findMany({
      where: { userId: user.id, OR: [{ liked: true }, { saved: true }] },
      select: {
        companionId: true,
        liked: true,
        saved: true,
      },
      take: 300,
    }),
    prisma.discoveryEvent.findMany({
      where: {
        userId: user.id,
        action: { in: ["SAVE", "START"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        companionId: true,
        action: true,
      },
      take: 300,
    }),
    prisma.conversation.findMany({
      where: { userId: user.id, contentRating: { in: allowedRatings } },
      orderBy: { updatedAt: "desc" },
      select: {
        companionId: true,
        familiarity: true,
        trust: true,
        intimacy: true,
        relationshipLevel: true,
        companion: {
          select: {
            tags: true,
            archetype: true,
          },
        },
      },
      take: 300,
    }),
  ]);

  const interactionCompanionIds = Array.from(
    new Set([
      ...reactions.map((r) => r.companionId),
      ...events.map((e) => e.companionId),
    ]),
  );
  const interactionCompanions =
    interactionCompanionIds.length > 0
      ? await prisma.companion.findMany({
          where: { id: { in: interactionCompanionIds } },
          select: { id: true, tags: true, archetype: true },
        })
      : [];
  const interactionCompanionById = new Map(
    interactionCompanions.map((c) => [c.id, c]),
  );

  const preferredTags = new Map<string, number>();
  const preferredArchetypes = new Map<string, number>();
  const relationshipBonusByCompanion = new Map<string, number>();

  for (const row of reactions) {
    const source = interactionCompanionById.get(row.companionId);
    if (!source) continue;
    const weight = row.saved ? 6 : row.liked ? 4 : 2;
    addTagWeights(preferredTags, source.tags, weight);
    if (source.archetype) {
      const key = source.archetype.toLowerCase();
      preferredArchetypes.set(key, (preferredArchetypes.get(key) ?? 0) + weight);
    }
  }

  for (const event of events) {
    const source = interactionCompanionById.get(event.companionId);
    if (!source) continue;
    const weight = event.action === "SAVE" ? 3 : 2;
    addTagWeights(preferredTags, source.tags, weight);
    if (source.archetype) {
      const key = source.archetype.toLowerCase();
      preferredArchetypes.set(key, (preferredArchetypes.get(key) ?? 0) + weight);
    }
  }

  for (const convo of conversations) {
    addTagWeights(preferredTags, convo.companion.tags, 1);
    if (convo.companion.archetype) {
      const key = convo.companion.archetype.toLowerCase();
      preferredArchetypes.set(key, (preferredArchetypes.get(key) ?? 0) + 1);
    }
    relationshipBonusByCompanion.set(
      convo.companionId,
      Math.round((convo.familiarity + convo.trust + convo.intimacy) / 30) +
        (convo.relationshipLevel ?? 1),
    );
  }

  const candidates = await prisma.companion.findMany({
    where: {
      visibility: Visibility.PUBLIC,
      contentRating: { in: allowedRatings },
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 250,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      archetype: true,
      contentRating: true,
      profile: true,
      assets: {
        where: {
          type: "IMAGE",
          contentRating: { in: allowedRatings },
        },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, publicUrl: true, contentRating: true },
      },
    },
  });

  const scored = candidates.map((candidate) => {
    const { score, reasons } = scoreCompanionMatch({
      preferredTags,
      preferredArchetypes,
      companionTags: candidate.tags,
      companionArchetype: candidate.archetype ?? null,
      profile: candidate.profile,
      relationshipBonus: relationshipBonusByCompanion.get(candidate.id) ?? 0,
    });

    const avatarFromProfile =
      candidate.profile &&
      typeof candidate.profile === "object" &&
      typeof (candidate.profile as Record<string, unknown>).avatarImageUrl === "string"
        ? String((candidate.profile as Record<string, unknown>).avatarImageUrl)
        : "";
    const asset = candidate.assets[0];
    const thumbnailUrl = asset
      ? asset.contentRating === ContentRating.ADULT
        ? `/media/${asset.id}`
        : asset.publicUrl ?? `/media/${asset.id}`
      : avatarFromProfile || null;

    return {
      id: candidate.id,
      slug: candidate.slug,
      name: candidate.name,
      description: candidate.description,
      tags: candidate.tags,
      archetype: candidate.archetype,
      contentRating: candidate.contentRating,
      score,
      reasons,
      thumbnailUrl,
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return NextResponse.json({
    ok: true,
    includeAdult,
    items: scored.slice(0, parsed.data.limit),
  });
}
