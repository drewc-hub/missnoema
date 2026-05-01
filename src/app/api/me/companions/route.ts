// file: src/app/api/me/companions/route.ts
import { NextResponse } from "next/server";
import { ContentRating } from "@prisma/client";
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

  const items = await prisma.companion.findMany({
    where: {
      ownerId: user.id,
      contentRating: {
        in: allowAdult
          ? [ContentRating.SAFE, ContentRating.ADULT]
          : [ContentRating.SAFE],
      },
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
          contentRating: {
            in: allowAdult
              ? [ContentRating.SAFE, ContentRating.ADULT]
              : [ContentRating.SAFE],
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          publicUrl: true,
        },
      },
    },
  });

  const normalized = items.map((item) => {
    const asset = item.assets[0];

    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      description: item.description,
      tags: item.tags,
      profile: item.profile,
      contentRating: item.contentRating,
      visibility: item.visibility,
      thumbnailUrl: asset ? (asset.publicUrl ?? `/media/${asset.id}`) : null,
    };
  });

  return NextResponse.json({ items: normalized });
}
