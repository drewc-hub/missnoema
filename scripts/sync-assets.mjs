// file: scripts/sync-assets.mjs
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const SRC_DIR = path.resolve(repoRoot, process.env.ASSETS_SRC ?? ".assets");
const DEST_DIR = path.resolve(
  repoRoot,
  process.env.ASSETS_DEST ?? "public/assets",
);

const DELETE_ORPHANS = (process.env.ASSETS_DELETE_ORPHANS ?? "0") === "1";
const MANIFEST_NAME = process.env.ASSETS_MANIFEST_NAME ?? "manifest.json";

// Upload toggles
const UPLOAD_SUPABASE = (process.env.ASSETS_UPLOAD_SUPABASE ?? "1") === "1";
const ADULT_PREFIX = (process.env.ASSETS_ADULT_PREFIX ?? "adult/").replace(
  /^\/+/,
  "",
); // default "adult/"

// Buckets
const SAFE_BUCKET = (
  process.env.SUPABASE_STORAGE_BUCKET_SAFE ?? "companion-media"
).trim();
const ADULT_BUCKET = (
  process.env.SUPABASE_STORAGE_BUCKET_ADULT ?? "companion-media-adult"
).trim();

// Supabase creds (server-only)
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SERVICE_ROLE = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

function requireJwt(name, v) {
  if (!v) throw new Error(`${name} missing`);
  if (v.split(".").length !== 3)
    throw new Error(
      `${name} must be a JWT (3 dot parts). You likely pasted the JWT secret, not the service_role key.`,
    );
  return v;
}

function decodeJwtPayload(jwt) {
  const p = jwt.split(".")[1];
  const s = Buffer.from(
    p.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
  return JSON.parse(s);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function* walkFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walkFiles(full);
    else if (ent.isFile()) yield full;
  }
}

function toPosix(p) {
  return p.split(path.sep).join("/");
}

async function sha256File(filePath) {
  const buf = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function contentTypeFromExt(p) {
  const ext = path.extname(p).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".json") return "application/json";
  return "application/octet-stream";
}

function isAdultRel(relPosix) {
  return relPosix.startsWith(ADULT_PREFIX);
}

function stripAdultPrefix(relPosix) {
  return isAdultRel(relPosix) ? relPosix.slice(ADULT_PREFIX.length) : relPosix;
}

async function readManifest(manifestPath) {
  if (!(await exists(manifestPath))) return null;
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function safeUnlink(p) {
  try {
    await fs.unlink(p);
  } catch {
    // ignore
  }
}

async function main() {
  if (!(await exists(SRC_DIR))) {
    // The asset source directory only exists on a developer's machine; CI/
    // production builders don't ship the raw asset source. Skip silently so
    // the (pre)build hook doesn't fail the deploy.
    console.warn(
      `sync-assets: source directory not found at ${SRC_DIR} — skipping (this is expected on a build server).`,
    );
    return;
  }

  await ensureDir(DEST_DIR);

  const destManifestPath = path.join(DEST_DIR, MANIFEST_NAME);
  const prevManifest = await readManifest(destManifestPath);
  const prevByKey = new Map(); // key = `${bucket}:${path}` => sha256
  if (prevManifest?.files?.length) {
    for (const f of prevManifest.files) {
      if (f.storageBucket && f.storagePath && f.sha256) {
        prevByKey.set(`${f.storageBucket}:${f.storagePath}`, f.sha256);
      }
    }
  }

  let supabase = null;
  if (UPLOAD_SUPABASE) {
    if (!SUPABASE_URL) throw new Error("NEXT_PUBLIC_SUPABASE_URL missing");
    const key = requireJwt("SUPABASE_SERVICE_ROLE_KEY", SERVICE_ROLE);
    const payload = decodeJwtPayload(key);
    if (payload.role !== "service_role") {
      throw new Error(
        `SUPABASE_SERVICE_ROLE_KEY must have role "service_role", got "${payload.role}"`,
      );
    }
    supabase = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false },
    });
  }

  const copiedLocal = [];
  const skippedLocal = [];
  const uploaded = [];
  const skippedUpload = [];
  const manifest = [];

  const srcFiles = [];
  for await (const f of walkFiles(SRC_DIR)) srcFiles.push(f);

  const desiredDestRelSet = new Set();

  for (const absSrc of srcFiles) {
    const rel = path.relative(SRC_DIR, absSrc);
    const relPosix = toPosix(rel);

    // local sync keeps the same relative path under public/assets
    desiredDestRelSet.add(relPosix);

    const absDest = path.join(DEST_DIR, rel);
    await ensureDir(path.dirname(absDest));

    const srcStat = await fs.stat(absSrc);
    const srcHash = await sha256File(absSrc);

    let shouldCopy = true;
    if (await exists(absDest)) {
      const destHash = await sha256File(absDest);
      shouldCopy = destHash !== srcHash;
    }

    if (shouldCopy) {
      await fs.copyFile(absSrc, absDest);
      copiedLocal.push(relPosix);
    } else {
      skippedLocal.push(relPosix);
    }

    // Supabase upload mapping
    const adult = isAdultRel(relPosix);
    const bucket = adult ? ADULT_BUCKET : SAFE_BUCKET;
    const storagePath = stripAdultPrefix(relPosix); // remove adult/ prefix for storage

    let publicUrl = null;

    if (UPLOAD_SUPABASE) {
      const key = `${bucket}:${storagePath}`;
      const prevHash = prevByKey.get(key);

      if (prevHash === srcHash) {
        skippedUpload.push(key);
      } else {
        const bytes = await fs.readFile(absSrc);
        const contentType = contentTypeFromExt(relPosix);

        const { error } = await supabase.storage
          .from(bucket)
          .upload(storagePath, bytes, {
            upsert: true,
            contentType,
          });

        if (error) {
          // Make the error actionable
          throw new Error(
            `Storage upload failed (${bucket}/${storagePath}): ${error.message}\n` +
              `Check: bucket exists, key role is service_role, and you're pointing to the correct project URL.`,
          );
        }

        uploaded.push(key);
      }

      if (!adult) {
        // SAFE bucket is public -> stable URL
        const { data } = supabase.storage
          .from(bucket)
          .getPublicUrl(storagePath);
        publicUrl = data.publicUrl;
      }
    }

    manifest.push({
      path: relPosix,
      bytes: srcStat.size,
      sha256: srcHash,
      mtimeMs: srcStat.mtimeMs,
      contentRating: adult ? "ADULT" : "SAFE",
      storageBucket: bucket,
      storagePath,
      publicUrl, // SAFE only; ADULT is private -> served via signed URLs in app
    });
  }

  const deleted = [];
  if (DELETE_ORPHANS) {
    const destFiles = [];
    for await (const f of walkFiles(DEST_DIR)) {
      const rel = toPosix(path.relative(DEST_DIR, f));
      if (rel === MANIFEST_NAME) continue;
      destFiles.push({ abs: f, rel });
    }

    for (const f of destFiles) {
      if (!desiredDestRelSet.has(f.rel)) {
        await safeUnlink(f.abs);
        deleted.push(f.rel);
      }
    }
  }

  manifest.sort((a, b) => a.path.localeCompare(b.path));
  await fs.writeFile(
    destManifestPath,
    JSON.stringify(
      { generatedAt: new Date().toISOString(), files: manifest },
      null,
      2,
    ),
  );

  console.log(
    [
      "sync-assets: done",
      `  src:  ${SRC_DIR}`,
      `  dest: ${DEST_DIR}`,
      `  local copied: ${copiedLocal.length}`,
      `  local unchanged: ${skippedLocal.length}`,
      DELETE_ORPHANS
        ? `  local deleted: ${deleted.length}`
        : "  local deleted: (disabled)",
      `  upload supabase: ${UPLOAD_SUPABASE ? "on" : "off"}`,
      UPLOAD_SUPABASE ? `  uploaded: ${uploaded.length}` : "  uploaded: (n/a)",
      UPLOAD_SUPABASE
        ? `  upload unchanged: ${skippedUpload.length}`
        : "  upload unchanged: (n/a)",
      `  manifest: ${path.relative(repoRoot, destManifestPath)}`,
    ].join("\n"),
  );
}

main().catch((err) => {
  console.error("sync-assets: failed");
  console.error(err);
  process.exit(1);
});
