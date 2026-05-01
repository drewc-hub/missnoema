import Replicate from "replicate";

function getClient() {
  const token = (process.env.REPLICATE_API_TOKEN ?? "").replace(/\s+/g, "");
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");
  return new Replicate({ auth: token });
}

const POLL_INTERVAL_MS = 3_000;  // 3s between polls
const TIMEOUT_MS = 10 * 60_000; // 10-minute hard timeout for the whole job
const REQUEST_TIMEOUT_MS = 60_000; // per-HTTP-request timeout (create/get)

/**
 * Build an AbortSignal that fires after `ms`. Returns a `cancel` function that
 * MUST be invoked once the awaited operation settles to clear the timer.
 */
function timeoutSignal(ms: number, label: string) {
  const ac = new AbortController();
  const timer = setTimeout(
    () => ac.abort(new Error(`${label} timed out after ${ms}ms`)),
    ms,
  );
  if (typeof (timer as { unref?: () => void }).unref === "function") {
    (timer as { unref: () => void }).unref();
  }
  return { signal: ac.signal, cancel: () => clearTimeout(timer) };
}

export interface GenerateVideoOptions {
  firstFrameImage?: string;  // URL of image to use as first frame (image-to-video)
  aspectRatio?: "16:9" | "9:16" | "1:1"; // default 16:9
  resolution?: "480p" | "720p";           // default 480p
  frames?: 17 | 33 | 49 | 65 | 81;       // default 81 (~5s at 16fps)
  negativePrompt?: string;
  seed?: number;
}

/**
 * Generate a video via wavespeedai/wan-2.1-t2v-480p on Replicate.
 * Open-source (Apache 2.0), no data-sharing gates.
 * Uses create-then-poll instead of replicate.run() to avoid serverless timeouts.
 * Returns the URL of the generated .mp4 file.
 */
export async function generateAdultVideo(
  prompt: string,
  options: GenerateVideoOptions = {},
): Promise<string> {
  const {
    firstFrameImage,
    aspectRatio = "16:9",
    resolution = "480p",
    frames = 81,
    negativePrompt,
    seed,
  } = options;

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    resolution,
    frames,
    sample_steps: 30,
    fast_mode: "Balanced",
  };

  if (firstFrameImage) input.image = firstFrameImage;
  if (negativePrompt) input.negative_prompt = negativePrompt;
  if (seed !== undefined) input.seed = seed;

  const replicate = getClient();

  // Create the prediction asynchronously — returns immediately with an ID.
  // Apply a per-request timeout so a stalled HTTPS handshake can't hang here.
  const createT = timeoutSignal(REQUEST_TIMEOUT_MS, "predictions.create");
  let prediction;
  try {
    prediction = await replicate.predictions.create({
      model: "wavespeedai/wan-2.1-t2v-480p",
      input,
      signal: createT.signal,
    });
  } finally {
    createT.cancel();
  }

  const deadline = Date.now() + TIMEOUT_MS;

  // Poll until the prediction reaches a terminal state
  while (true) {
    const status = prediction.status;

    if (status === "succeeded") {
      // wan-2.1 returns an array of URIs
      const output = prediction.output as string | string[] | null;
      if (!output) throw new Error("Video generation succeeded but output is empty");
      return Array.isArray(output) ? output[0] : output;
    }

    if (status === "failed" || status === "canceled") {
      throw new Error(
        `Video generation ${status}: ${prediction.error ?? "unknown error"}`,
      );
    }

    if (Date.now() > deadline) {
      throw new Error(`Video generation timed out after ${TIMEOUT_MS / 1000}s`);
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

    // Fetch updated prediction state with a per-request timeout. Without this,
    // a network stall on a single poll could exceed the overall deadline
    // because the deadline is only checked between iterations.
    const getT = timeoutSignal(REQUEST_TIMEOUT_MS, "predictions.get");
    try {
      prediction = await replicate.predictions.get(prediction.id, {
        signal: getT.signal,
      });
    } finally {
      getT.cancel();
    }
  }
}
