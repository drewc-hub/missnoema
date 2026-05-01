// file: src/app/media/[assetId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { requireAdultAllowed } from "@/lib/ratings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ContentRating } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;

  const asset = await prisma.companionAsset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      contentRating: true,
      storageBucket: true,
      storagePath: true,
      publicUrl: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (asset.contentRating === ContentRating.SAFE && asset.publicUrl) {
    return NextResponse.redirect(asset.publicUrl);
  }

  const user = await getAuthedUser();

  try {
    requireAdultAllowed(user);
  } catch {
    return new NextResponse("Age verification required for adult content.", {
      status: 403,
    });
  }

  const { data, error } = await createSupabaseAdminClient().storage
    .from(asset.storageBucket)
    .createSignedUrl(asset.storagePath, 60);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.redirect(data.signedUrl);
}
