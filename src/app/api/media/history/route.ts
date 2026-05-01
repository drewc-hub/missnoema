// file: src/app/api/media/history/route.ts
import { NextResponse } from "next/server";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const companionId = url.searchParams.get("companionId") ?? "";

  if (!companionId) {
    return NextResponse.json(
      { error: "Missing companionId." },
      { status: 400 },
    );
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      ownerId: user.id,
    },
    select: {
      id: true,
      contentRating: true,
    },
  });

  if (!companion) {
    return NextResponse.json(
      { error: "Companion not found." },
      { status: 404 },
    );
  }

  if (
    companion.contentRating === ContentRating.ADULT &&
    !isAdultAllowed(user)
  ) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  const items = await prisma.companionAsset.findMany({
    where: {
      companionId: companion.id,
      contentRating:
        companion.contentRating === ContentRating.ADULT && isAdultAllowed(user)
          ? { in: [ContentRating.SAFE, ContentRating.ADULT] }
          : ContentRating.SAFE,
    },
    orderBy: [{ isFavorite: "desc" }, { createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      type: true,
      contentRating: true,
      publicUrl: true,
      createdAt: true,
      isFavorite: true,
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      contentRating: item.contentRating,
      createdAt: item.createdAt,
      isFavorite: item.isFavorite,
      url: item.publicUrl ?? `/media/${item.id}`,
    })),
  });
}
