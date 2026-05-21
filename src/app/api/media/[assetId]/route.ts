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
  const focalX = typeof body?.focalX === "number" ? Math.max(0, Math.min(100, body.focalX)) : undefined;
  const focalY = typeof body?.focalY === "number" ? Math.max(0, Math.min(100, body.focalY)) : undefined;

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};
  if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
  if (isCover !== undefined) updateData.isCover = isCover;
  if (focalX !== undefined || focalY !== undefined) {
    const current = await prisma.companionAsset.findUnique({ where: { id }, select: { metadata: true } });
    const existing = (current?.metadata ?? {}) as Record<string, unknown>;
    updateData.metadata = {
      ...existing,
      ...(focalX !== undefined ? { focalX } : {}),
      ...(focalY !== undefined ? { focalY } : {}),
    };
  }

  const updated = await prisma.companionAsset.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      isFavorite: true,
      isCover: true,
      metadata: true,
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
