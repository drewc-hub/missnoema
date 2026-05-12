import "server-only";

import { ContentRating, DiscoveryAction, Visibility } from "@prisma/client";
import type { AuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { prisma } from "@/lib/prisma";
import { PremiumFeature, hasUserFeature } from "@/lib/premium";

type MatchmakingProfile = {
  seekingTags?: string[];
  avoidTags?: string[];
  weights?: {
    personality?: number;
    tags?: number;
    affinity?: number;
  };
};

export function scoreCompanionMatch(args: {
  preferredTags: Map<string, number>;
  preferredArchetypes: Map<string, number>;
  companionTags: string[];
  companionArchetype: string | null;
  profile: unknown;
  relationshipBonus?: number;
}) {
  const {
    preferredTags,
    preferredArchetypes,
    companionTags,
    companionArchetype,
    profile,
    relationshipBonus = 0,
  } = args;

  const meta =
    profile && typeof profile === "object"
      ? (profile as Record<string, unknown>)
      : {};
  const matchmaking =
    meta.matchmaking && typeof meta.matchmaking === "object"
      ? (meta.matchmaking as MatchmakingProfile)
      : {};

  const weights = {
    personality: Number(matchmaking.weights?.personality ?? 1.2),
    tags: Number(matchmaking.weights?.tags ?? 1.4),
    affinity: Number(matchmaking.weights?.affinity ?? 1.0),
  };

  let score = 0;
  const reasons: string[] = [];

  for (const tag of companionTags) {
    const normalized = tag.toLowerCase();
    const pref = preferredTags.get(normalized) ?? 0;
    if (pref > 0) {
      score += pref * weights.tags;
    }
  }
  if (score > 0) {
    reasons.push("tag affinity");
  }

  if (companionArchetype) {
    const a = preferredArchetypes.get(companionArchetype.toLowerCase()) ?? 0;
    if (a > 0) {
      score += a * weights.personality;
      reasons.push("archetype affinity");
    }
  }

  const seeking = (matchmaking.seekingTags ?? []).map((t) => t.toLowerCase());
  const avoid = (matchmaking.avoidTags ?? []).map((t) => t.toLowerCase());

  const overlap = companionTags
    .map((t) => t.toLowerCase())
    .filter((t) => seeking.includes(t)).length;
  if (overlap > 0) {
    score += overlap * 3;
    reasons.push("profile targeting");
  }

  const avoidOverlap = companionTags
    .map((t) => t.toLowerCase())
    .filter((t) => avoid.includes(t)).length;
  if (avoidOverlap > 0) {
    score -= avoidOverlap * 4;
  }

  if (relationshipBonus > 0) {
    score += relationshipBonus * weights.affinity;
    reasons.push("relationship progression");
  }

  return {
    score,
    reasons: [...new Set(reasons)],
  };
}

type MatchmakingItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  archetype: string | null;
  contentRating: ContentRating;
  score: number;
  reasons: string[];
  thumbnailUrl: string | null;
  saved: boolean;
};

function addTagWeights(map: Map<string, number>, tags: string[], weight: number) {
  for (const tag of tags) {
    const key = tag.toLowerCase();
    map.set(key, (map.get(key) ?? 0) + weight);
  }
}

export async function getMatchmakingDeck(args: {
  user: AuthedUser | null;
  includeAdult?: boolean;
  limit?: number;
  excludeIds?: string[];
}) {
  const { user, includeAdult = false, excludeIds = [] } = args;
  const limit = Math.min(50, Math.max(1, Number(args.limit) || 16));
  const adultAllowed = includeAdult && isAdultAllowed(user);
  const allowedRatings = adultAllowed
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];
  const hasPremiumCompanions = user
    ? await hasUserFeature(user.id, PremiumFeature.PREMIUM_COMPANIONS)
    : false;

  const uniqueExcludeIds = Array.from(new Set(excludeIds.filter(Boolean)));
  const blockedSince = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

  const [reactions, events, conversations, blockedRows] = user
    ? await Promise.all([
        prisma.companionReaction.findMany({
          where: { userId: user.id, OR: [{ liked: true }, { saved: true }] },
          select: { companionId: true, liked: true, saved: true },
          take: 300,
        }),
        prisma.discoveryEvent.findMany({
          where: { userId: user.id, action: { in: [DiscoveryAction.SAVE, DiscoveryAction.START] } },
          select: { companionId: true, action: true },
          orderBy: { createdAt: "desc" },
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
            companion: { select: { tags: true, archetype: true } },
          },
          take: 300,
        }),
        prisma.discoveryEvent.findMany({
          where: {
            userId: user.id,
            action: { in: [DiscoveryAction.PASS, DiscoveryAction.START] },
            createdAt: { gte: blockedSince },
          },
          distinct: ["companionId"],
          select: { companionId: true },
          take: 300,
        }),
      ])
    : [[], [], [], []];

  const blockedIds = new Set<string>([
    ...uniqueExcludeIds,
    ...blockedRows.map((row) => row.companionId),
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
  const interactionCompanionById = new Map(interactionCompanions.map((c) => [c.id, c]));

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
    const weight = event.action === DiscoveryAction.SAVE ? 3 : 2;
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
      ...(hasPremiumCompanions
        ? {}
        : { NOT: { profile: { path: ["premiumOnly"], equals: true } } }),
      id: blockedIds.size > 0 ? { notIn: Array.from(blockedIds) } : undefined,
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 300,
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
        where: { type: "IMAGE", contentRating: { in: allowedRatings } },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, publicUrl: true, contentRating: true },
      },
    },
  });

  const savedIds = user
    ? new Set(
        (
          await prisma.companionReaction.findMany({
            where: {
              userId: user.id,
              companionId: { in: candidates.map((candidate) => candidate.id) },
              saved: true,
            },
            select: { companionId: true },
          })
        ).map((row) => row.companionId),
      )
    : new Set<string>();

  const scored: MatchmakingItem[] = candidates.map((candidate) => {
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
      saved: savedIds.has(candidate.id),
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    items: scored.slice(0, limit),
    includeAdult: adultAllowed,
    exhausted: scored.length < limit,
  };
}
