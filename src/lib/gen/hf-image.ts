// file: src/lib/gen/hf-image.ts
import { InferenceClient } from "@huggingface/inference";

function getClient() {
  const token = (process.env.HF_TOKEN ?? "").replace(/\s+/g, "");
  if (!token) throw new Error("Missing HF_TOKEN");
  return new InferenceClient(token);
}

export interface HfImageOptions {
  /** 0–5 intensity scale — maps to guidance_scale */
  intensity?: number;
  aspectRatio?: "2:3" | "3:2" | "1:1" | "9:16" | "16:9";
  seed?: number;
  numInferenceSteps?: number;
  /** fal-ai, together-ai, etc. — defaults to fal-ai */
  provider?: string;
  /** Override the model ID */
  model?: string;
}

// Raise guidance_scale with intensity for more literal/explicit output.
function intensityToGuidance(intensity: number): number {
  return 3.5 + intensity * 0.8; // 0 → 3.5, 5 → 7.5
}

function aspectRatioToSize(ar: string): { width: number; height: number } {
  const map: Record<string, { width: number; height: number }> = {
    "2:3": { width: 832, height: 1216 },
    "3:2": { width: 1216, height: 832 },
    "1:1": { width: 1024, height: 1024 },
    "9:16": { width: 768, height: 1344 },
    "16:9": { width: 1344, height: 768 },
  };
  return map[ar] ?? { width: 832, height: 1216 };
}

/**
 * Generate an image via HuggingFace InferenceClient routed through fal-ai.
 * Returns { bytes, contentType } matching the shape the worker expects.
 */
export async function generateHfImageBytes(
  prompt: string,
  options: HfImageOptions = {},
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const {
    intensity = 1,
    aspectRatio = "2:3",
    seed,
    numInferenceSteps = 28,
    provider = "fal-ai",
    model = "black-forest-labs/FLUX.1-dev",
  } = options;

  const { width, height } = aspectRatioToSize(aspectRatio);
  const client = getClient();

  // Pass outputType: "blob" explicitly to select the Blob overload.
  const result = await client.textToImage(
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: provider as any,
      model,
      inputs: prompt,
      parameters: {
        width,
        height,
        num_inference_steps: numInferenceSteps,
        guidance_scale: intensityToGuidance(intensity),
        ...(seed !== undefined ? { seed } : {}),
      },
    },
    { outputType: "blob" },
  );

  // result is Blob when outputType is "blob"
  const blob = result as Blob;
  const buffer = await blob.arrayBuffer();
  return {
    bytes: new Uint8Array(buffer),
    contentType: blob.type || "image/jpeg",
  };
}
