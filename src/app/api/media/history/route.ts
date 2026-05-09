import { NextResponse } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
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
      OR: [{ ownerId: user.id }, { visibility: Visibility.PUBLIC }],
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

  const allowAdult = isAdultAllowed(user);

  const items = await prisma.companionAsset.findMany({
    where: {
      companionId: companion.id,
      contentRating:
        companion.contentRating === ContentRating.ADULT && allowAdult
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
      storagePath: true,
      createdAt: true,
      isFavorite: true,
      isCover: true,
    },
  });

  return NextResponse.json({
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      contentRating: item.contentRating,
      createdAt: item.createdAt,
      isFavorite: item.isFavorite,
      isCover: item.isCover,
      // Adult assets live in a private bucket — always route through /media/<id>
      // so the server can issue a signed URL. Safe assets use publicUrl directly.
      url: item.contentRating === ContentRating.ADULT
        ? `/media/${item.id}`
        : (item.publicUrl ?? `/media/${item.id}`),
    })),
  });
}
