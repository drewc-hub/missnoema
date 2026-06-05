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
    "THUMBNAIL_IMAGE_MODEL",
    "black-forest-labs/flux-dev",
);
const DISABLE_SAFETY_CHECKER =
    env("THUMBNAIL_DISABLE_SAFETY_CHECKER", "true").toLowerCase() === "true";
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

const args = new Set(process.argv.slice(2));
const valueArg = (name: string) =>
    process.argv
        .slice(2)
        .find((arg) => arg.startsWith(`${name}=`))
        ?.slice(name.length + 1)
        .trim();
const DRY_RUN = args.has("--dry-run");
const COUNT_ONLY = args.has("--count-only");
const LIMIT = Math.max(0, Number(valueArg("--limit") ?? "0") || 0);
const ONLY_SLUG = valueArg("--slug") ?? "";
const INCLUDE_ALL_PENDING = args.has("--all-pending");
const MAX_FAILURES = Math.max(0, Number(valueArg("--max-failures") ?? "5") || 0);

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
    tags: string[];
    archetype: string | null;
    gender: string | null;
    race: string | null;
    aestheticTags: string[];
    profile: any;
}): string {
    const { name, tags, archetype, gender, race, aestheticTags, profile } = companion;
    const wardrobe =
        typeof profile?.wardrobe === "string" ? profile.wardrobe : "";
    const safeVisualTags = [...tags, ...aestheticTags]
        .filter((tag) => !/adult|nsfw|explicit|erotic|sexual|kink|nude|dominant|submissive|seductive|sensual/i.test(tag))
        .slice(0, 8);

    return [
        "safe-for-work fantasy character portrait",
        "vertical companion card cover",
        `character named ${name}`,
        archetype ? `archetype: ${archetype}` : "",
        gender ? `gender presentation: ${gender}` : "",
        race ? `fantasy ancestry: ${race}` : "",
        wardrobe ? `wardrobe: ${wardrobe}` : "",
        safeVisualTags.length ? `visual themes: ${safeVisualTags.join(", ")}` : "",
        "adult character",
        "fully clothed",
        "head and shoulders visible",
        "face fully inside frame",
        "no text",
        "no watermark",
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
    rating: ContentRating,
): Promise<{ bytes: Uint8Array; contentType: string }> {
    const { signal, cancel } = timeoutSignal(REPLICATE_TIMEOUT_MS, "replicate.run");
    let output: unknown;
    try {
        const input: Record<string, unknown> = {
            prompt,
            aspect_ratio: "2:3",
            output_format: "webp",
            output_quality: 90,
        };

        if (IMAGE_MODEL === "black-forest-labs/flux-dev") {
            input.megapixels = "1";
            input.num_outputs = 1;
            input.num_inference_steps = 28;
            input.guidance = 3.5;
            input.disable_safety_checker = DISABLE_SAFETY_CHECKER;
        } else {
            input.resolution = "1 MP";
            input.safety_tolerance = rating === ContentRating.ADULT ? 5 : 2;
        }

        output = await replicate.run(IMAGE_MODEL as `${string}/${string}`, {
            input,
            signal,
        });
    } finally {
        cancel();
    }

    async function extractUrl(value: unknown): Promise<string | null> {
        if (!value) return null;
        if (typeof value === "string") return value;
        if (value instanceof URL) return value.href;
        if (Array.isArray(value)) {
            for (const item of value) {
                const url = await extractUrl(item);
                if (url) return url;
            }
            return null;
        }
        if (typeof value !== "object") return null;

        const record = value as Record<string, unknown>;
        if (typeof record.url === "string") return record.url;
        if (typeof record.url === "function") {
            const r = await record.url();
            if (typeof r === "string") return r;
            if (r instanceof URL) return r.href;
        }
        if (typeof record.href === "string") return record.href;

        for (const key of ["output", "outputs", "output_paths", "files", "images"]) {
            if (key in record) {
                const url = await extractUrl(record[key]);
                if (url) return url;
            }
        }

        const s = String(value);
        if (/^https?:\/\//.test(s)) return s;
        return null;
    }

    const url = await extractUrl(output);

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
            isCover: true,
            metadata: {
                source: "generate-companion-thumbnails",
                model: IMAGE_MODEL,
            },
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
    archetype: string | null;
    gender: string | null;
    race: string | null;
    aestheticTags: string[];
    contentRating: ContentRating;
    profile: any;
}): Promise<void> {
    const prompt = buildThumbnailPrompt(companion);

    console.log(`  [gen] prompt: ${prompt.slice(0, 120)}...`);

    const { bytes, contentType } = await generateImageBytes(
        prompt,
        companion.contentRating,
    );

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
        `[thumbnails] Safety checker: ${DISABLE_SAFETY_CHECKER ? "disabled" : "enabled"}`,
    );
    console.log(
        `[thumbnails] Buckets: SAFE=${SAFE_BUCKET}, ADULT=${ADULT_BUCKET}`,
    );
    console.log(
        `[thumbnails] Concurrency: ${CONCURRENCY}, batch delay: ${BATCH_DELAY_MS}ms`,
    );
    console.log(
        `[thumbnails] Mode: ${DRY_RUN ? "dry run" : "generate"}${LIMIT ? `, limit=${LIMIT}` : ""}${ONLY_SLUG ? `, slug=${ONLY_SLUG}` : ""}, target=${INCLUDE_ALL_PENDING ? "all pending" : "generic DiceBear covers"}, max failures=${MAX_FAILURES || "unlimited"}`,
    );

    // DiceBear/generic profile avatars are not CompanionAsset records, so this
    // selects companions that still need a generated cover.
    const pendingCompanions = await prisma.companion.findMany({
        where: {
            ...(ONLY_SLUG ? { slug: ONLY_SLUG } : {}),
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
            archetype: true,
            gender: true,
            race: true,
            aestheticTags: true,
            contentRating: true,
            profile: true,
        },
        orderBy: { createdAt: "asc" },
    });
    const companions = pendingCompanions
        .filter((companion) => {
            if (INCLUDE_ALL_PENDING || ONLY_SLUG) return true;
            const profile =
                companion.profile && typeof companion.profile === "object"
                    ? (companion.profile as Record<string, unknown>)
                    : {};
            return typeof profile.avatarImageUrl === "string"
                && profile.avatarImageUrl.includes("dicebear.com");
        })
        .slice(0, LIMIT || undefined);

    const total = companions.length;

    if (total === 0) {
        console.log("[thumbnails] All companions already have image assets. Nothing to do.");
        await prisma.$disconnect();
        return;
    }

    console.log(`[thumbnails] Found ${total} companion(s) without image assets.`);

    if (COUNT_ONLY) return;

    if (DRY_RUN) {
        for (const [index, companion] of companions.entries()) {
            const profile =
                companion.profile && typeof companion.profile === "object"
                    ? (companion.profile as Record<string, unknown>)
                    : {};
            const avatar = typeof profile.avatarImageUrl === "string"
                ? profile.avatarImageUrl
                : "";
            console.log(
                `[thumbnails] ${index + 1}/${total}: "${companion.name}" (${companion.slug})${avatar.includes("dicebear.com") ? " [generic DiceBear cover]" : ""}`,
            );
        }
        return;
    }

    let succeeded = 0;
    let failed = 0;

    // Process in batches of CONCURRENCY
    for (let i = 0; i < companions.length; i += CONCURRENCY) {
        const batch = companions.slice(i, i + CONCURRENCY);

        await Promise.all(
            batch.map(async (companion, batchIndex) => {
                const index = i + batchIndex + 1;
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

        if (MAX_FAILURES > 0 && failed >= MAX_FAILURES) {
            console.error(
                `[thumbnails] Stopping after ${failed} failures. Use --max-failures=0 to disable this guard.`,
            );
            break;
        }

        // Pause between batches to avoid hammering Replicate rate limits
        if (i + CONCURRENCY < companions.length && BATCH_DELAY_MS > 0) {
            await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
    }

    console.log(
        `[thumbnails] Done. succeeded=${succeeded}, failed=${failed}, total=${total}`,
    );

}

main()
    .catch((err) => {
        console.error("[thumbnails] Fatal error:", err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
