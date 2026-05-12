import "server-only";

import { ContentRating, DiscoveryAction, Visibility } from "@prisma/client";
import type { AuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type DiscoveryDeckItem = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  thumbnailUrl: string | null;
  saved: boolean;
};

export async function getDiscoveryDeck({
  user,
  limit = 20,
  excludeIds = [],
}: {
  user: AuthedUser | null;
  limit?: number;
  excludeIds?: string[];
}) {
  const safeLimit = Math.min(30, Math.max(1, Number(limit) || 20));
  const uniqueExcludeIds = Array.from(new Set(excludeIds.filter(Boolean)));
  const blockedSince = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

  const recentlyRejectedIds = user
    ? await prisma.discoveryEvent.findMany({
        where: {
          userId: user.id,
          action: { in: [DiscoveryAction.PASS, DiscoveryAction.START] },
          createdAt: { gte: blockedSince },
        },
        distinct: ["companionId"],
        take: 300,
        select: { companionId: true },
      })
    : [];

  const blockedIds = new Set([
    ...uniqueExcludeIds,
    ...recentlyRejectedIds.map((event) => event.companionId),
  ]);

  const companions = await prisma.companion.findMany({
    where: {
      visibility: Visibility.PUBLIC,
      contentRating: ContentRating.SAFE,
      id: blockedIds.size > 0 ? { notIn: Array.from(blockedIds) } : undefined,
      assets: {
        some: {
          type: "IMAGE",
          contentRating: ContentRating.SAFE,
        },
      },
    },
    orderBy: [
      { saves: "desc" },
      { likes: "desc" },
      { views: "desc" },
      { createdAt: "desc" },
    ],
    take: safeLimit,
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      assets: {
        where: {
          type: "IMAGE",
          contentRating: ContentRating.SAFE,
        },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, publicUrl: true },
      },
    },
  });

  const savedReactions = user
    ? await prisma.companionReaction.findMany({
        where: {
          userId: user.id,
          companionId: { in: companions.map((companion) => companion.id) },
          saved: true,
        },
        select: { companionId: true },
      })
    : [];

  const savedIds = new Set(savedReactions.map((reaction) => reaction.companionId));

  const items: DiscoveryDeckItem[] = companions.map((companion) => {
    const asset = companion.assets[0];

    return {
      id: companion.id,
      slug: companion.slug,
      name: companion.name,
      description: companion.description,
      tags: companion.tags,
      thumbnailUrl: asset ? asset.publicUrl ?? `/media/${asset.id}` : null,
      saved: savedIds.has(companion.id),
    };
  });

  return {
    items,
    exhausted: items.length < safeLimit,
  };
}
