// A2E.ai text-to-image generator
// Docs: https://video.a2e.ai/dev
// Auth: Authorization: Bearer sk_...  (set A2E_API_KEY env var)

const BASE = "https://video.a2e.ai";
const POLL_INTERVAL_MS = 3_000;
const MAX_WAIT_MS = 300_000; // 5 minutes

type A2eStatus = "pending" | "processing" | "completed" | "failed";

interface A2eStartResponse {
    _id: string;
    current_status: A2eStatus;
}

interface A2eDetailResponse {
    _id: string;
    current_status: A2eStatus;
    // completed jobs have image URLs here
    output?: Array<{ url?: string; cdnUrl?: string }>;
    error?: string;
}

function apiKey(): string {
    const key = process.env.A2E_API_KEY?.trim();
    if (!key) throw new Error("Missing A2E_API_KEY env var");
    return key;
}

function headers() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey()}`,
    };
}

export interface A2eImageOptions {
    modelType?: "a2e" | "seedream";
    aspectRatio?: "1:1" | "4:3" | "3:4" | "16:9" | "9:16" | "2:3" | "3:2" | "21:9";
    width?: number;
    height?: number;
    maxImages?: number;
}

/**
 * Generate an image via a2e.ai and return the first result as bytes.
 * Polls until complete or timeout.
 */
export async function generateA2eImageBytes(
    prompt: string,
    options: A2eImageOptions = {},
): Promise<{ bytes: Uint8Array; contentType: string }> {
    const {
        modelType = "a2e",
        aspectRatio = "2:3",
        width,
        height,
        maxImages = 1,
    } = options;

    // Start generation
    const startRes = await fetch(`${BASE}/api/v1/userText2Image/start`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
            prompt,
            model_type: modelType,
            aspect_ratio: aspectRatio,
            ...(width ? { width } : {}),
            ...(height ? { height } : {}),
            max_images: maxImages,
        }),
        signal: AbortSignal.timeout(30_000),
    });

    if (!startRes.ok) {
        const text = await startRes.text().catch(() => "");
        throw new Error(`A2E start failed (${startRes.status}): ${text.slice(0, 200)}`);
    }

    const started = (await startRes.json()) as A2eStartResponse;
    const taskId = started._id;
    if (!taskId) throw new Error("A2E returned no task ID");

    // Poll until done
    const deadline = Date.now() + MAX_WAIT_MS;
    while (Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

        const pollRes = await fetch(`${BASE}/api/v1/userText2Image/${taskId}`, {
            headers: headers(),
            signal: AbortSignal.timeout(15_000),
        });

        if (!pollRes.ok) continue;

        const detail = (await pollRes.json()) as A2eDetailResponse;

        if (detail.current_status === "failed") {
            throw new Error(`A2E generation failed: ${detail.error ?? "unknown error"}`);
        }

        if (detail.current_status === "completed") {
            const imageUrl = detail.output?.[0]?.cdnUrl ?? detail.output?.[0]?.url;
            if (!imageUrl) throw new Error("A2E completed but returned no image URL");

            const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
            if (!imgRes.ok) throw new Error(`A2E image download failed (${imgRes.status})`);

            const ab = await imgRes.arrayBuffer();
            const ct = imgRes.headers.get("content-type") ?? "image/jpeg";
            return { bytes: new Uint8Array(ab), contentType: ct };
        }
        // pending / processing — keep polling
    }

    throw new Error(`A2E generation timed out after ${MAX_WAIT_MS / 1000}s`);
}
