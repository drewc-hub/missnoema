import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating, GenerationType } from "@prisma/client";

export const runtime = "nodejs";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;   // 10 MB
const MAX_VIDEO_BYTES = 300 * 1024 * 1024;  // 300 MB

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (user.suspendedAt) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data." }, { status: 400 });

  const file = formData.get("file");
  const companionId = formData.get("companionId");

  if (!file || typeof file === "string") return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (!companionId || typeof companionId !== "string") return NextResponse.json({ error: "Missing companionId." }, { status: 400 });

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed. Images: JPEG, PNG, WebP, GIF. Videos: MP4, WebM, MOV." }, { status: 400 });
  }

  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  const bytes = await file.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    return NextResponse.json({ error: isVideo ? "Video too large (max 300 MB)." : "Image too large (max 10 MB)." }, { status: 400 });
  }

  const companion = await prisma.companion.findFirst({
    where: { id: companionId, ownerId: user.id },
    select: { id: true, contentRating: true },
  });
  if (!companion) return NextResponse.json({ error: "Companion not found." }, { status: 404 });

  const isAdult = companion.contentRating === ContentRating.ADULT;
  if (isAdult && !isAdultAllowed(user)) {
    return NextResponse.json({ error: "Age verification required." }, { status: 403 });
  }

  const bucket = isAdult
    ? (process.env.SUPABASE_STORAGE_BUCKET_ADULT ?? "companion-media-adult")
    : (process.env.SUPABASE_STORAGE_BUCKET_SAFE ?? "companion-media");

  const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `companions/${companion.id}/uploads/${user.id}-${Date.now()}.${ext}`;

  const sb = supabaseAdmin();
  const { error: uploadError } = await sb.storage
    .from(bucket)
    .upload(path, new Uint8Array(bytes), { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }

  let publicUrl = "";
  if (!isAdult) {
    const { data } = sb.storage.from(bucket).getPublicUrl(path);
    publicUrl = data.publicUrl;
  }

  const asset = await prisma.companionAsset.create({
    data: {
      companionId: companion.id,
      ownerId: user.id,
      type: isVideo ? GenerationType.VIDEO : GenerationType.IMAGE,
      contentRating: companion.contentRating,
      storageBucket: bucket,
      storagePath: path,
      publicUrl: publicUrl || null,
    },
    select: { id: true, publicUrl: true },
  });

  // For adult assets, set a signed-proxy URL
  if (isAdult) {
    const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
    const url = `${base}/media/${asset.id}`;
    await prisma.companionAsset.update({ where: { id: asset.id }, data: { publicUrl: url } });
    asset.publicUrl = url;
  }

  return NextResponse.json({ ok: true, assetId: asset.id, publicUrl: asset.publicUrl });
}
