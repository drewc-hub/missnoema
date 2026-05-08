import { NextResponse } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const allowAdult = isAdultAllowed(user);
  const allowedRatings = allowAdult
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];

  const items = await prisma.companion.findMany({
    where: {
      contentRating: { in: allowedRatings },
      OR: [
        { ownerId: user.id },
        { visibility: Visibility.PUBLIC },
      ],
    },
    orderBy: { updatedAt: "desc" },
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
        // Prefer ADULT cover on adult-rated companions ("ADULT" < "SAFE")
        orderBy: [{ contentRating: "asc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, publicUrl: true, contentRating: true },
      },
    },
  });

  const normalized = items.map((item) => {
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

  return NextResponse.json({ items: normalized });
}
