import { NextResponse, type NextRequest } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const allowAdult = isAdultAllowed(user);
  const allowedRatings = allowAdult
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];

  // Companion explicitly requested (e.g. clicked from library)
  const include = new URL(req.url).searchParams.get("include");

  // Companions the user has previously chatted with
  const conversations = await prisma.conversation.findMany({
    where: { userId: user.id, deletedAt: null },
    distinct: ["companionId"],
    select: { companionId: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });

  const chattedIds = conversations.map((c) => c.companionId);

  // Merge: requested companion first, then chatted ones (deduplicated)
  const ids = include
    ? [include, ...chattedIds.filter((id) => id !== include)]
    : chattedIds;

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }

  const rows = await prisma.companion.findMany({
    where: {
      id: { in: ids },
      contentRating: { in: allowedRatings },
      OR: [{ visibility: Visibility.PUBLIC }, { ownerId: user.id }],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      profile: true,
      contentRating: true,
      visibility: true,
      assets: {
        where: {
          type: "IMAGE",
          contentRating: { in: allowedRatings },
        },
        orderBy: [{ contentRating: "asc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, publicUrl: true, contentRating: true },
      },
    },
  });

  // Restore the caller's requested order (requested first, then by conversation recency)
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [r] : [];
  });

  const items = ordered.map((item) => {
    const asset = item.assets[0];
    const thumbnailUrl = asset
      ? asset.contentRating === ContentRating.ADULT
        ? `/media/${asset.id}`
        : (asset.publicUrl ?? `/media/${asset.id}`)
      : null;

    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      tags: item.tags,
      profile: item.profile,
      contentRating: item.contentRating,
      visibility: item.visibility,
      thumbnailUrl,
    };
  });

  return NextResponse.json({ items });
}
