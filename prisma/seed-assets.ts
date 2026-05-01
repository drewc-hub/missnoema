// FILE: prisma/seed-assets.ts
import { PrismaClient, ContentRating, GenerationType } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function env(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function guessContentType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

async function existsDir(p: string): Promise<boolean> {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

async function listImageFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) =>
      [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(
        path.extname(n).toLowerCase(),
      ),
    )
    .sort();
  return files;
}

function safePathSegment(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function makeSupabaseAdmin() {
  return createClient(
    requireEnv("SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false },
    },
  );
}

async function ensurePublicBucketExists(
  sb: ReturnType<typeof makeSupabaseAdmin>,
  bucketName: string,
) {
  const { data, error } = await sb.storage.listBuckets();
  if (error) throw new Error(error.message);

  const exists = (data ?? []).some((b) => b.name === bucketName);
  if (exists) return;

  const { error: createErr } = await sb.storage.createBucket(bucketName, {
    public: true,
  });
  if (createErr) throw new Error(createErr.message);
}

async function uploadCoverImage(params: {
  sb: ReturnType<typeof makeSupabaseAdmin>;
  bucket: string;
  storagePath: string;
  localFilePath: string;
  contentType: string;
}) {
  const fileBuf = await fs.readFile(params.localFilePath);

  const { error } = await params.sb.storage
    .from(params.bucket)
    .upload(params.storagePath, fileBuf, {
      upsert: true,
      cacheControl: "3600",
      contentType: params.contentType,
    });

  if (error) throw new Error(error.message);

  const publicUrl = params.sb.storage
    .from(params.bucket)
    .getPublicUrl(params.storagePath).data.publicUrl;
  return publicUrl;
}

async function main() {
  const sb = makeSupabaseAdmin();

  const bucketCover = env("SUPABASE_BUCKET_COVER", "companion-media");
  const assetsPerCompanion = Number(env("SEED_ASSETS_PER_COMPANION", "1"));
  const prefix = env("SEED_ASSET_PREFIX", "companions");

  // Choose assets folder
  const configuredDir = process.env.ASSETS_DIR;
  const fallbackDirs = [
    "src/public/avatars",
    "public/avatars",
    "src/public/images",
    "public/images",
  ];

  let assetsDir = configuredDir ?? "";
  if (!assetsDir) {
    for (const d of fallbackDirs) {
      if (await existsDir(d)) {
        assetsDir = d;
        break;
      }
    }
  }
  if (!assetsDir)
    throw new Error(
      `No assets directory found. Set ASSETS_DIR or create one of: ${fallbackDirs.join(", ")}`,
    );

  console.log(`Seeding assets into bucket: ${bucketCover}`);
  console.log(`Using local assets dir: ${assetsDir}`);

  await ensurePublicBucketExists(sb, bucketCover);

  const files = await listImageFiles(assetsDir);
  if (files.length === 0)
    throw new Error(`No image files found in ${assetsDir}`);

  const companions = await prisma.companion.findMany({
    select: { id: true, slug: true, contentRating: true },
    orderBy: { createdAt: "asc" },
  });

  if (companions.length === 0) {
    console.log(
      "No companions found. Seed companions first, then run seed-assets.",
    );
    return;
  }

  let createdCount = 0;
  let uploadedCount = 0;

  for (const companion of companions) {
    // Only seed SAFE cover images here. (Adult assets should be a separate script/bucket.)
    if (companion.contentRating !== ContentRating.SAFE) continue;

    const n = Math.max(1, assetsPerCompanion);
    for (let i = 0; i < n; i++) {
      const chosen = files[(createdCount + i) % files.length];
      const localFilePath = path.join(assetsDir, chosen);

      const storagePath = `${prefix}/${safePathSegment(companion.slug)}/cover/${i + 1}-${safePathSegment(
        path.parse(chosen).name,
      )}${path.extname(chosen).toLowerCase()}`;

      // If already exists in DB, skip (prevents duplicates across reruns)
      const exists = await prisma.companionAsset.findFirst({
        where: {
          companionId: companion.id,
          type: GenerationType.IMAGE,
          contentRating: ContentRating.SAFE,
          storageBucket: bucketCover,
          storagePath,
        },
        select: { id: true },
      });
      if (exists) continue;

      const publicUrl = await uploadCoverImage({
        sb,
        bucket: bucketCover,
        storagePath,
        localFilePath,
        contentType: guessContentType(chosen),
      });
      uploadedCount++;

      await prisma.companionAsset.create({
        data: {
          companionId: companion.id,
          type: GenerationType.IMAGE,
          contentRating: ContentRating.SAFE,
          storageBucket: bucketCover,
          storagePath,
          publicUrl,
        },
      });
      createdCount++;
    }
  }

  console.log(
    `Done. Uploaded=${uploadedCount}, DB rows created=${createdCount}`,
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
