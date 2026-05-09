// file: src/app/api/media/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating } from "@prisma/client";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId: id } = await params;

  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const isFavorite = Boolean(body?.isFavorite);

  const asset = await prisma.companionAsset.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
    select: {
      id: true,
      contentRating: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  if (asset.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  const updated = await prisma.companionAsset.update({
    where: { id },
    data: { isFavorite },
    select: {
      id: true,
      isFavorite: true,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId: id } = await params;

  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const asset = await prisma.companionAsset.findFirst({
    where: {
      id,
      companion: {
        ownerId: user.id,
      },
    },
    select: {
      id: true,
      contentRating: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Media not found." }, { status: 404 });
  }

  if (asset.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  await prisma.companionAsset.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true, id });
}
