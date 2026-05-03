import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assetId } = await params;

  const asset = await prisma.companionAsset.findFirst({
    where: {
      id: assetId,
      userId: user.id,
    },
    select: {
      id: true,
      storageBucket: true,
      storagePath: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  if (asset.storageBucket && asset.storagePath) {
    const supabase = getSupabaseAdmin();

    await supabase.storage
      .from(asset.storageBucket)
      .remove([asset.storagePath]);
  }

  await prisma.companionAsset.delete({
    where: { id: asset.id },
  });

  return NextResponse.json({ ok: true });
}
