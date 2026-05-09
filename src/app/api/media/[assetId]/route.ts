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
  const isFavorite = typeof body?.isFavorite === "boolean" ? body.isFavorite : undefined;
  const isCover = typeof body?.isCover === "boolean" ? body.isCover : undefined;

  const asset = await prisma.companionAsset.findFirst({
    where: {
      id,
      ownerId: user.id,
    },
    select: {
      id: true,
      companionId: true,
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

  // When setting a new cover, clear the existing cover for this companion first
  if (isCover === true) {
    await prisma.companionAsset.updateMany({
      where: { companionId: asset.companionId, isCover: true },
      data: { isCover: false },
    });
  }

  const updateData: Record<string, boolean> = {};
  if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
  if (isCover !== undefined) updateData.isCover = isCover;

  const updated = await prisma.companionAsset.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      isFavorite: true,
      isCover: true,
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
