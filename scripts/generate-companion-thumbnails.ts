import "dotenv/config";
import { PrismaClient, ContentRating, GenerationType } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function env(name: string, fallback?: string): string {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
    if (fallback != null) return fallback;
    throw new Error(`Missing required env var: ${name}`);
}

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

const prisma = new PrismaClient();

const supabase = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
);

const replicate = new Replicate({
    auth: env("REPLICATE_API_TOKEN").replace(/\s+/g, ""),
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const IMAGE_MODEL = env(
    "REPLICATE_IMAGE_MODEL",
    "zedge/stable-diffusion:69d39dcbb296da580994d867890ba2410d1fb6be9da9225d9bb48da2181594cf",
);
const SAFE_BUCKET = env("SUPABASE_STORAGE_BUCKET_SAFE", "companion-media");
const ADULT_BUCKET = env(
    "SUPABASE_STORAGE_BUCKET_ADULT",
    "companion-media-adult",
);
const CONCURRENCY = Number(env("THUMBNAIL_CONCURRENCY", "1"));
const BATCH_DELAY_MS = Number(env("THUMBNAIL_BATCH_DELAY_MS", "2000"));
const BASE_URL = env("BASE_URL", "http://localhost:3000").replace(/\/+$/, "");

// Per-operation timeouts (ms)
const REPLICATE_TIMEOUT_MS = 10 * 60_000; // 10 min
const FETCH_TIMEOUT_MS = 2 * 60_000; // 2 min
const UPLOAD_TIMEOUT_MS = 5 * 60_000; // 5 min

// ---------------------------------------------------------------------------
// Timeout helpers (mirrors worker/index.ts)
// ---------------------------------------------------------------------------

function timeoutSignal(ms: number, label: string) {
    const ac = new AbortController();
    const timer = setTimeout(() => {
        ac.abort(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    if (typeof (timer as any).unref === "function") (timer as any).unref();
    return { signal: ac.signal, cancel: () => clearTimeout(timer) };
}

async function fetchWithTimeout(
    url: string,
    ms: number = FETCH_TIMEOUT_MS,
    label = "fetch",
): Promise<Response> {
    const { signal, cancel } = timeoutSignal(ms, label);
    try {
        return await fetch(url, { signal });
    } finally {
        cancel();
    }
}

// ---------------------------------------------------------------------------
// Prompt builder (mirrors buildEnhancedImagePrompt in worker/index.ts)
// ---------------------------------------------------------------------------

function buildThumbnailPrompt(companion: {
    name: string;
    description: string;
    tags: string[];
    profile: any;
}): string {
    const { name, description, tags, profile } = companion;

    const scene = typeof profile?.scene === "string" ? profile.scene : "";
    const wardrobe =
        typeof profile?.wardrobe === "string" ? profile.wardrobe : "";
    const personality =
        typeof profile?.personality === "string" ? profile.personality : "";
    const traits = Array.isArray(profile?.traits)
        ? (profile.traits as string[]).join(", ")
        : "";

    // Base prompt: portrait thumbnail suitable for a companion library card
    const userPrompt = `portrait thumbnail, companion card, ${name}`;

    return [
        userPrompt,
        `character: ${name}`,
        description ? `description: ${description}` : "",
        scene ? `scene: ${scene}` : "",
        wardrobe ? `wardrobe: ${wardrobe}` : "",
        personality ? `personality: ${personality}` : "",
        traits ? `traits: ${traits}` : "",
        tags.length ? `tags: ${tags.join(", ")}` : "",
        "cinematic lighting",
        "highly detailed",
        "clean composition",
        "sharp focus",
        "high quality",
        "natural skin tones",
        "depth of field",
    ]
        .filter(Boolean)
        .join(", ");
}

// ---------------------------------------------------------------------------
// Image generation (mirrors generateImageBytes in worker/index.ts)
// ---------------------------------------------------------------------------

async function generateImageBytes(
    prompt: string,
): Promise<{ bytes: Uint8Array; contentType: string }> {
    const { signal, cancel } = timeoutSignal(REPLICATE_TIMEOUT_MS, "replicate.run");
    let output: unknown;
    try {
        output = await replicate.run(IMAGE_MODEL as `${string}/${string}`, {
            input: { prompt },
            signal,
        });
    } finally {
        cancel();
    }

    async function extractUrl(value: any): Promise<string | null> {
        if (!value) return null;
        if (typeof value === "string") return value;
        if (typeof value?.url === "string") return value.url;
        if (typeof value?.url === "function") {
            const r = await value.url();
            if (typeof r === "string") return r;
        }
        if (typeof value?.href === "string") return value.href;
        const s = String(value);
        if (/^https?:\/\//.test(s)) return s;
        return null;
    }

    let url: string | null = null;
    if (Array.isArray(output)) {
        url = await extractUrl(output[0]);
    } else {
        url = await extractUrl(output);
    }

    if (!url) {
        throw new Error(
            `Replicate returned no output URL. Raw: ${JSON.stringify(output)}`,
        );
    }

    const res = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, `download ${url}`);
    if (!res.ok) {
        throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    }
    const ab = await res.arrayBuffer();
    const contentType =
        res.headers.get("content-type") ?? "application/octet-stream";
    return { bytes: new Uint8Array(ab), contentType };
}

// ---------------------------------------------------------------------------
// Supabase upload (mirrors uploadToSupabase in worker/index.ts)
// ---------------------------------------------------------------------------

function extFromContentType(ct: string): string {
    const c = ct.toLowerCase();
    if (c.includes("png")) return "png";
    if (c.includes("jpeg") || c.includes("jpg")) return "jpg";
    if (c.includes("webp")) return "webp";
    return "webp"; // flux-dev default
}

async function uploadToSupabase(opts: {
    rating: ContentRating;
    bytes: Uint8Array;
    contentType: string;
    companionId: string;
    slug: string;
}): Promise<{ bucket: string; storagePath: string; publicUrl: string }> {
    const bucket =
        opts.rating === ContentRating.ADULT ? ADULT_BUCKET : SAFE_BUCKET;
    const ext = extFromContentType(opts.contentType);
    const storagePath = `companions/${opts.companionId}/images/thumbnail-${Date.now()}.${ext}`;

    const upload = supabase.storage
        .from(bucket)
        .upload(storagePath, opts.bytes, {
            upsert: true,
            contentType: opts.contentType,
        });

    // Race against a hard timeout (supabase-js doesn't expose AbortSignal on uploads)
    const { error } = await Promise.race([
        upload,
        new Promise<never>((_, reject) => {
            const t = setTimeout(
                () =>
                    reject(
                        new Error(
                            `Supabase upload timed out after ${UPLOAD_TIMEOUT_MS}ms`,
                        ),
                    ),
                UPLOAD_TIMEOUT_MS,
            );
            if (typeof (t as any).unref === "function") (t as any).unref();
        }),
    ]);

    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    let publicUrl = "";
    if (opts.rating === ContentRating.SAFE) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
        publicUrl = data.publicUrl;
    }

    return { bucket, storagePath, publicUrl };
}

// ---------------------------------------------------------------------------
// Asset record creation (mirrors createAsset in worker/index.ts)
// ---------------------------------------------------------------------------

async function createAssetRecord(opts: {
    companionId: string;
    rating: ContentRating;
    bucket: string;
    storagePath: string;
    publicUrl: string;
}): Promise<{ id: string; publicUrl: string }> {
    const asset = await prisma.companionAsset.create({
        data: {
            companionId: opts.companionId,
            ownerId: null, // system-generated; prebuilt companions have no owner
            type: GenerationType.IMAGE,
            contentRating: opts.rating,
            storageBucket: opts.bucket,
            storagePath: opts.storagePath,
            publicUrl: opts.publicUrl || "about:blank",
        },
        select: { id: true },
    });

    // Adult assets are served via the signed-URL proxy route
    if (opts.rating === ContentRating.ADULT) {
        const url = `${BASE_URL}/media/${asset.id}`;
        await prisma.companionAsset.update({
            where: { id: asset.id },
            data: { publicUrl: url },
        });
        return { id: asset.id, publicUrl: url };
    }

    return { id: asset.id, publicUrl: opts.publicUrl };
}

// ---------------------------------------------------------------------------
// Per-companion processing
// ---------------------------------------------------------------------------

async function processCompanion(companion: {
    id: string;
    name: string;
    slug: string;
    description: string;
    tags: string[];
    contentRating: ContentRating;
    profile: any;
}): Promise<void> {
    const prompt = buildThumbnailPrompt(companion);

    console.log(`  [gen] prompt: ${prompt.slice(0, 120)}...`);

    const { bytes, contentType } = await generateImageBytes(prompt);

    const uploaded = await uploadToSupabase({
        rating: companion.contentRating,
        bytes,
        contentType,
        companionId: companion.id,
        slug: companion.slug,
    });

    const asset = await createAssetRecord({
        companionId: companion.id,
        rating: companion.contentRating,
        bucket: uploaded.bucket,
        storagePath: uploaded.storagePath,
        publicUrl: uploaded.publicUrl,
    });

    console.log(
        `  [gen] asset created: ${asset.id} → ${asset.publicUrl.slice(0, 80)}`,
    );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
    console.log("[thumbnails] Starting companion thumbnail generation...");
    console.log(`[thumbnails] Model: ${IMAGE_MODEL}`);
    console.log(
        `[thumbnails] Buckets: SAFE=${SAFE_BUCKET}, ADULT=${ADULT_BUCKET}`,
    );
    console.log(
        `[thumbnails] Concurrency: ${CONCURRENCY}, batch delay: ${BATCH_DELAY_MS}ms`,
    );

    // Find all companions with zero IMAGE assets
    const companions = await prisma.companion.findMany({
        where: {
            assets: {
                none: {
                    type: GenerationType.IMAGE,
                },
            },
        },
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            tags: true,
            contentRating: true,
            profile: true,
        },
        orderBy: { createdAt: "asc" },
    });

    const total = companions.length;

    if (total === 0) {
        console.log("[thumbnails] All companions already have image assets. Nothing to do.");
        await prisma.$disconnect();
        return;
    }

    console.log(`[thumbnails] Found ${total} companion(s) without image assets.`);

    let succeeded = 0;
    let failed = 0;

    // Process in batches of CONCURRENCY
    for (let i = 0; i < companions.length; i += CONCURRENCY) {
        const batch = companions.slice(i, i + CONCURRENCY);

        await Promise.all(
            batch.map(async (companion) => {
                const index = companions.indexOf(companion) + 1;
                console.log(
                    `[thumbnails] Processing ${index}/${total}: "${companion.name}" (${companion.slug}) [${companion.contentRating}]`,
                );

                try {
                    await processCompanion(companion);
                    succeeded++;
                    console.log(`[thumbnails] Generated ${succeeded}/${total} ✓`);
                } catch (err: any) {
                    failed++;
                    console.error(
                        `[thumbnails] ✗ Failed "${companion.name}" (${companion.slug}): ${err?.message ?? String(err)}`,
                    );
                }
            }),
        );

        // Pause between batches to avoid hammering Replicate rate limits
        if (i + CONCURRENCY < companions.length && BATCH_DELAY_MS > 0) {
            await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
    }

    console.log(
        `[thumbnails] Done. succeeded=${succeeded}, failed=${failed}, total=${total}`,
    );

    await prisma.$disconnect();
}

main().catch((err) => {
    console.error("[thumbnails] Fatal error:", err);
    process.exit(1);
});
