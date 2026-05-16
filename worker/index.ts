// file: worker/index.ts
import "dotenv/config";
import {
    PrismaClient,
    JobStatus,
    GenerationType,
    ContentRating,
} from "@prisma/client";
import { generateAdultVideo } from "../src/lib/gen/replicate-video.js";
import { generateProImage } from "../src/lib/gen/replicate-image.js";
import { generateHfImageBytes } from "../src/lib/gen/hf-image.js";
import { generateLeonardoImageBytes } from "../src/lib/gen/leonardo-image.js";
import { createClient } from "@supabase/supabase-js";
import Replicate from "replicate";

const prisma = new PrismaClient();

function env(name: string, fallback?: string) {
    const v = process.env[name];
    if (v && v.trim()) return v.trim();
    if (fallback != null) return fallback;
    throw new Error(`Missing env var: ${name}`);
}

const supabaseAdmin = createClient(
    env("NEXT_PUBLIC_SUPABASE_URL"),
    env("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } },
);

const replicate = new Replicate({
    auth: env("REPLICATE_API_TOKEN").replace(/\s+/g, ""),
});

const POLL_MS = Number(env("WORKER_POLL_MS", "1500"));
const CONCURRENCY = Number(env("WORKER_CONCURRENCY", "2"));

// Per-request network timeouts (ms). Override via env if needed.
const FETCH_TIMEOUT_MS = Number(env("WORKER_FETCH_TIMEOUT_MS", "120000")); // 2 min
const REPLICATE_RUN_TIMEOUT_MS = Number(
    env("WORKER_REPLICATE_RUN_TIMEOUT_MS", "600000"), // 10 min
);
const SUPABASE_UPLOAD_TIMEOUT_MS = Number(
    env("WORKER_SUPABASE_UPLOAD_TIMEOUT_MS", "300000"), // 5 min
);

/**
 * Returns an AbortSignal that aborts after `ms` milliseconds, plus a `cancel`
 * function the caller MUST invoke once the operation completes (success or
 * failure) so the timer doesn't leak and so the signal isn't fired late.
 */
function timeoutSignal(ms: number, label: string) {
    const ac = new AbortController();
    const timer = setTimeout(() => {
        ac.abort(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    // Don't keep the event loop alive solely for this timer.
    if (typeof (timer as any).unref === "function") (timer as any).unref();
    return {
        signal: ac.signal,
        cancel: () => clearTimeout(timer),
    };
}

/**
 * fetch wrapper that enforces a hard timeout via AbortController. Aborts both
 * the request and any in-flight body streaming if the deadline elapses.
 */
async function fetchWithTimeout(
    input: string | URL | Request,
    init: RequestInit = {},
    ms: number = FETCH_TIMEOUT_MS,
    label = "fetch",
): Promise<Response> {
    const { signal, cancel } = timeoutSignal(ms, label);
    // Compose with any caller-provided signal.
    const composed = init.signal
        ? AbortSignal.any([init.signal, signal])
        : signal;
    try {
        return await fetch(input, { ...init, signal: composed });
    } finally {
        cancel();
    }
}

function safeBucketFor(rating: ContentRating) {
    return rating === ContentRating.ADULT
        ? env("SUPABASE_STORAGE_BUCKET_ADULT", "companion-media-adult")
        : env("SUPABASE_STORAGE_BUCKET_SAFE", "companion-media");
}

function baseUrl() {
    return env("BASE_URL", "http://localhost:3000").replace(/\/+$/, "");
}

function scrubSecrets(msg: string) {
    return msg.replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]");
}

async function sleep(ms: number) {
    await new Promise((r) => setTimeout(r, ms));
}

async function downloadToBytes(url: string) {
    // Hard timeout covers both connection/headers and body streaming.
    const res = await fetchWithTimeout(
        url,
        {},
        FETCH_TIMEOUT_MS,
        `download ${url}`,
    );
    if (!res.ok)
        throw new Error(`Download failed: ${res.status} ${res.statusText}`);
    // arrayBuffer() doesn't accept a signal; rely on the fetch-level abort to
    // surface as a stream error here if the connection stalls mid-body.
    const ab = await res.arrayBuffer();
    const ct = res.headers.get("content-type") ?? "application/octet-stream";
    return { bytes: new Uint8Array(ab), contentType: ct };
}
const PRIMARY_REPLICATE_MODEL = "zedge/stable-diffusion:69d39dcbb296da580994d867890ba2410d1fb6be9da9225d9bb48da2181594cf" as const;

async function extractReplicateUrl(output: unknown): Promise<string | null> {
    if (!output) return null;

    // Plain string URL
    if (typeof output === "string") {
        if (/^https?:\/\//.test(output)) return output;
        return null;
    }

    // URL object (.href)
    if (typeof (output as any)?.href === "string") return (output as any).href;

    // Replicate SDK FileOutput: .url() returns a URL object or string
    if (typeof (output as any)?.url === "function") {
        try {
            const r = await (output as any).url();
            if (!r) return null;
            if (typeof r === "string" && /^https?:\/\//.test(r)) return r;
            if (typeof (r as any)?.href === "string") return (r as any).href;
            const rs = String(r);
            if (/^https?:\/\//.test(rs)) return rs;
        } catch {
            // fall through to toString
        }
    }

    // .url as plain string property
    if (typeof (output as any)?.url === "string" && /^https?:\/\//.test((output as any).url)) {
        return (output as any).url;
    }

    // toString / Symbol.toPrimitive (some FileOutput versions)
    const s = String(output);
    if (/^https?:\/\//.test(s)) return s;

    return null;
}

async function runReplicate(
    model: string,
    input: Record<string, unknown>,
): Promise<{ bytes: Uint8Array; contentType: string }> {
    const { signal, cancel } = timeoutSignal(REPLICATE_RUN_TIMEOUT_MS, "replicate.run");
    let output: unknown;
    try {
        output = await replicate.run(model as `${string}/${string}`, { input, signal });
    } finally {
        cancel();
    }

    const isArr = Array.isArray(output);
    const raw = isArr ? (output as unknown[])[0] : output;

    console.log("[worker] replicate output type:", typeof output, isArr ? `array[${(output as unknown[]).length}]` : "scalar");
    if (raw && typeof raw === "object") {
        console.log("[worker] raw keys:", Object.keys(raw as object));
    }

    // FileOutput extends ReadableStream — read bytes directly via .blob()
    if (raw && typeof (raw as any).blob === "function") {
        console.log("[worker] using blob() path");
        const blob: Blob = await (raw as any).blob();
        const ab = await blob.arrayBuffer();
        return { bytes: new Uint8Array(ab), contentType: blob.type || "image/webp" };
    }

    const url = await extractReplicateUrl(raw);
    if (!url) throw new Error(`Replicate returned no URL. Raw type=${typeof raw} keys=${raw && typeof raw === "object" ? Object.keys(raw as object) : "n/a"}`);
    return downloadToBytes(url);
}

async function generateImageBytes(
    prompt: string,
    contentRating: ContentRating,
    negativePrompt?: string | null,
) {
    const isAdult = contentRating === ContentRating.ADULT;
    const defaultNegativePrompt = isAdult
        ? env("LEONARDO_ADULT_NEGATIVE_PROMPT", "watermark, text, logo, signature, blurry, deformed, bad anatomy, low quality, extra limbs, missing limbs")
        : env("LEONARDO_NEGATIVE_PROMPT", "watermark, text, logo, signature, blurry, deformed, bad anatomy, low quality, extra limbs, missing limbs");
    const finalNegativePrompt = negativePrompt?.trim() || defaultNegativePrompt;

    // ── Primary: Replicate zedge/stable-diffusion ──────────────────────────
    try {
        console.log("[worker] trying primary Replicate model:", PRIMARY_REPLICATE_MODEL);
        return await runReplicate(PRIMARY_REPLICATE_MODEL, {
            prompt,
            negative_prompt: finalNegativePrompt,
            width: 768,
            height: 1024,
            num_inference_steps: 30,
            guidance_scale: 7.5,
            scheduler: "DPMSolverMultistep",
        });
    } catch (primaryErr: any) {
        console.warn("[worker] primary Replicate model failed, falling back:", primaryErr?.message ?? primaryErr);
    }

    // ── Fallback: configured IMAGE_PROVIDER ───────────────────────────────
    const provider = env("IMAGE_PROVIDER", "leonardo");

    if (provider === "leonardo") {
        return generateLeonardoImageBytes(prompt, {
            width: Number(env("LEONARDO_IMAGE_WIDTH", "768")),
            height: Number(env("LEONARDO_IMAGE_HEIGHT", "1024")),
            numImages: 1,
            modelId: env("LEONARDO_IMAGE_MODEL_ID", "7b592283-e8a7-4c5a-9ba6-d18c31f258b9"),
            styleUUID: env("LEONARDO_STYLE_UUID", "111dc692-d470-4eec-b791-3475abac4c46"),
            alchemy: env("LEONARDO_ALCHEMY", "false") === "true",
            ultra: env("LEONARDO_ULTRA", "false") === "true",
            public: env("LEONARDO_PUBLIC", "false") === "true",
            numInferenceSteps: Number(env("LEONARDO_STEPS", "20")),
            guidanceScale: Number(env("LEONARDO_GUIDANCE_SCALE", "7")),
            contrast: Number(env("LEONARDO_CONTRAST", "3.5")),
            negativePrompt: finalNegativePrompt,
            nsfw: env("LEONARDO_ADULT_NSFW", "true") === "true",
        } as any);
    }

    if (provider === "hf") {
        return generateHfImageBytes(prompt, {
            provider: env("HF_PROVIDER", "fal-ai"),
            model: isAdult
                ? env("HF_ADULT_IMAGE_MODEL", "xai-org/grok-2")
                : env("HF_IMAGE_MODEL", "black-forest-labs/FLUX.1-dev"),
            intensity: isAdult ? 3 : 1,
            aspectRatio: "2:3",
        });
    }

    const fallbackModel = isAdult
        ? env("REPLICATE_ADULT_IMAGE_MODEL", "google/nano-banana-2:71516450bdbeafc41df33ad538bc8cc6a90f80038a563b1260531c02d694f4fd")
        : env("REPLICATE_IMAGE_MODEL", "black-forest-labs/flux-dev");

    return runReplicate(fallbackModel, {
        prompt,
        negative_prompt: finalNegativePrompt,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width: 768,
        height: 1024,
        disable_safety_checker: true,
    });
}

function extFromContentType(ct: string) {
    const c = ct.toLowerCase();
    if (c.includes("png")) return "png";
    if (c.includes("jpeg")) return "jpg";
    if (c.includes("webp")) return "webp";
    if (c.includes("mp4")) return "mp4";
    if (c.includes("webm")) return "webm";
    return "bin";
}

async function uploadToSupabase(opts: {
    rating: ContentRating;
    kind: GenerationType;
    bytes: Uint8Array;
    contentType: string;
    companionId: string;
    jobId: string;
}) {
    const bucket = safeBucketFor(opts.rating);
    const ext = extFromContentType(opts.contentType);
    const folder = opts.kind === GenerationType.IMAGE ? "images" : "videos";
    const path = `companions/${opts.companionId}/${folder}/${opts.jobId}-${Date.now()}.${ext}`;

    // supabase-js doesn't expose AbortSignal on storage uploads, so race against
    // a timeout to avoid hanging forever on a stalled upload.
    const upload = supabaseAdmin.storage
        .from(bucket)
        .upload(path, opts.bytes, {
            upsert: true,
            contentType: opts.contentType,
        });
    const { error } = await Promise.race([
        upload,
        new Promise<never>((_, reject) => {
            const t = setTimeout(
                () =>
                    reject(
                        new Error(
                            `Supabase upload timed out after ${SUPABASE_UPLOAD_TIMEOUT_MS}ms`,
                        ),
                    ),
                SUPABASE_UPLOAD_TIMEOUT_MS,
            );
            if (typeof (t as any).unref === "function") (t as any).unref();
        }),
    ]);
    if (error) throw new Error(`Storage upload failed: ${error.message}`);

    // SAFE can be a public URL; ADULT stays private and served via /media/:assetId
    let publicUrl = "";
    if (opts.rating === ContentRating.SAFE) {
        const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(path);
        publicUrl = data.publicUrl;
    }

    return { bucket, path, publicUrl };
}

async function createAsset(opts: {
    companionId: string;
    ownerId: string;
    kind: GenerationType;
    rating: ContentRating;
    bucket: string;
    path: string;
    publicUrl: string;
}) {
    const asset = await prisma.companionAsset.create({
        data: {
            companionId: opts.companionId,
            ownerId: opts.ownerId,
            type: opts.kind,
            contentRating: opts.rating,
            storageBucket: opts.bucket,
            storagePath: opts.path,
            publicUrl: opts.publicUrl || "about:blank",
        },
        select: { id: true },
    });

    // For private (adult) assets, set publicUrl to your signed media route
    if (opts.rating === ContentRating.ADULT) {
        const url = `${baseUrl()}/media/${asset.id}`;
        await prisma.companionAsset.update({
            where: { id: asset.id },
            data: { publicUrl: url },
        });
        return { id: asset.id, publicUrl: url };
    }

    return { id: asset.id, publicUrl: opts.publicUrl };
}

// 🔒 Claim up to N jobs using SKIP LOCKED
async function claimJobs(limit: number) {
    const rows = await prisma.$queryRaw<
        Array<{
            id: string;
            userId: string;
            companionId: string | null;
            type: GenerationType;
            contentRating: ContentRating;
            prompt: string;
            negativePrompt: string | null;
        }>
    >`
    WITH picked AS (
      SELECT j."id"
      FROM "GenerationJob" j
      WHERE j."status" = ${JobStatus.PENDING}::"JobStatus"
      ORDER BY j."createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    )
    UPDATE "GenerationJob" j
    SET
      "status" = ${JobStatus.RUNNING}::"JobStatus",
      "startedAt" = NOW(),
      "updatedAt" = NOW(),
      "error" = NULL
    FROM picked
    WHERE j."id" = picked."id"
    RETURNING
      j."id",
      j."userId",
      j."companionId",
      j."type",
      j."contentRating",
      j."prompt",
      j."negativePrompt";
  `;
    return rows;
}
async function finishSucceeded(
    jobId: string,
    data: { resultUrl: string; bucket: string; path: string },
) {
    await prisma.generationJob.update({
        where: { id: jobId },
        data: {
            status: JobStatus.SUCCEEDED,
            finishedAt: new Date(),
            error: null,
            resultUrl: data.resultUrl,
            resultBucket: data.bucket,
            resultPath: data.path,
        },
    });
}
async function finishFailed(jobId: string, message: string) {
    await prisma.generationJob.update({
        where: { id: jobId },
        data: {
            status: JobStatus.FAILED,
            finishedAt: new Date(),
            error: scrubSecrets(message),
        },
    });
}

function buildEnhancedImagePrompt(args: {
    userPrompt: string;
    companionName?: string | null;
    description?: string | null;
    tags?: string[];
    profile?: any;
}) {
    const { userPrompt, companionName, description, tags = [], profile } = args;

    const scene = typeof profile?.scene === "string" ? profile.scene : "";
    const wardrobe =
        typeof profile?.wardrobe === "string" ? profile.wardrobe : "";
    const personality =
        typeof profile?.personality === "string" ? profile.personality : "";
    const traits = Array.isArray(profile?.traits)
        ? profile.traits.join(", ")
        : "";

    return [
        userPrompt,
        companionName ? `character: ${companionName}` : "",
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
async function processJob(j: Awaited<ReturnType<typeof claimJobs>>[number]) {
    if (!j.companionId) throw new Error("Job missing companionId");

    // Fetch extra metadata not returned by the raw claimJobs query
    const jobMeta = await prisma.generationJob.findUnique({
        where: { id: j.id },
        select: { requestPreset: true, requestTag: true, negativePrompt: true },
    });
    const imagePromptUrl = jobMeta?.requestPreset ?? null; // Flux Redux reference image URL
    const mode = jobMeta?.requestTag ?? "standard";
    const negativePrompt = jobMeta?.negativePrompt ?? j.negativePrompt ?? null;

    if (j.type === GenerationType.VIDEO) {
        const videoUrl = await generateAdultVideo(j.prompt, {
            negativePrompt: negativePrompt ?? undefined,
        });
        const { bytes, contentType } = await downloadToBytes(videoUrl);
        const uploaded = await uploadToSupabase({
            rating: j.contentRating,
            kind: j.type,
            bytes,
            contentType,
            companionId: j.companionId,
            jobId: j.id,
        });
        const asset = await createAsset({
            companionId: j.companionId,
            ownerId: j.userId,
            kind: j.type,
            rating: j.contentRating,
            bucket: uploaded.bucket,
            path: uploaded.path,
            publicUrl: uploaded.publicUrl,
        });
        await finishSucceeded(j.id, {
            resultUrl: asset.publicUrl,
            bucket: uploaded.bucket,
            path: uploaded.path,
        });
        return;
    }

    const companion = await prisma.companion.findUnique({
        where: { id: j.companionId },
        select: {
            name: true,
            description: true,
            tags: true,
            profile: true,
        },
    });

    const enhancedPrompt = buildEnhancedImagePrompt({
        userPrompt: j.prompt,
        companionName: companion?.name ?? null,
        description: companion?.description ?? null,
        tags: companion?.tags ?? [],
        profile: companion?.profile,
    });

    console.log("[worker] enhanced prompt:", enhancedPrompt, "| mode:", mode, "| imagePrompt:", !!imagePromptUrl);

    let gen: { bytes: Uint8Array; contentType: string };

    if (imagePromptUrl && (mode === "outfit" || mode === "undress")) {
        // Flux Redux: use reference image to preserve identity while changing outfit/clothing
        const intensity = mode === "undress" ? 5 : 2;
        const resultUrl = await generateProImage(enhancedPrompt, {
            imagePrompt: imagePromptUrl,
            intensity,
            negativePrompt: negativePrompt ?? undefined,
        });
        gen = await downloadToBytes(resultUrl);
    } else {
        gen = await generateImageBytes(enhancedPrompt, j.contentRating, negativePrompt);
    }

    const uploaded = await uploadToSupabase({
        rating: j.contentRating,
        kind: j.type,
        bytes: gen.bytes,
        contentType: gen.contentType,
        companionId: j.companionId,
        jobId: j.id,
    });

    const asset = await createAsset({
        companionId: j.companionId,
        ownerId: j.userId,
        kind: j.type,
        rating: j.contentRating,
        bucket: uploaded.bucket,
        path: uploaded.path,
        publicUrl: uploaded.publicUrl,
    });

    await finishSucceeded(j.id, {
        resultUrl: asset.publicUrl,
        bucket: uploaded.bucket,
        path: uploaded.path,
    });
}
async function main() {
    console.log("[worker] postgres-queue start", {
        pollMs: POLL_MS,
        concurrency: CONCURRENCY,
    });

    while (true) {
        const jobs = await claimJobs(CONCURRENCY);
        if (!jobs.length) {
            await sleep(POLL_MS);
            continue;
        }

        await Promise.all(
            jobs.map(async (j) => {
                try {
                    await processJob(j);
                } catch (e: any) {
                    await finishFailed(j.id, e?.message ?? String(e));
                }
            }),
        );
    }
}

main().catch((e) => {
    console.error("[worker] fatal", e);
    process.exit(1);
});
