import Replicate from "replicate";

function getClient() {
  const token = (process.env.REPLICATE_API_TOKEN ?? "").replace(/\s+/g, "");
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");
  return new Replicate({ auth: token });
}

// Maps intensity (0–5) to Replicate safety_tolerance (1=strict … 5=permissive).
// Intensity 0–1 → 2 (default), 2–3 → 3, 4 → 4, 5 → 5
function intensityToSafetyTolerance(intensity: number): number {
  if (intensity <= 1) return 2;
  if (intensity <= 3) return 3;
  if (intensity === 4) return 4;
  return 5;
}

export interface GenerateImageOptions {
  intensity?: number;
  aspectRatio?: string;
  outputFormat?: "webp" | "jpg" | "png";
  outputQuality?: number;
  negativePrompt?: string;
  seed?: number;
}

export interface GenerateProImageOptions extends GenerateImageOptions {
  imagePrompt?: string;       // Flux Redux: guide composition from a reference image
  promptUpsampling?: boolean; // auto-enhance prompt for more creative output
}

export async function generateAdultImage(
  prompt: string,
  options: GenerateImageOptions = {},
) {
  const {
    intensity = 1,
    aspectRatio = "2:3",
    outputFormat = "webp",
    outputQuality = 90,
    negativePrompt,
    seed,
  } = options;

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: outputFormat,
    output_quality: outputQuality,
    safety_tolerance: intensityToSafetyTolerance(intensity),
    resolution: "1 MP",
  };

  if (negativePrompt) input.negative_prompt = negativePrompt;
  if (seed !== undefined) input.seed = seed;

  const replicate = getClient();
  const output = await replicate.run("black-forest-labs/flux-2-max", { input });

  // flux-2-max returns a single URI string
  return typeof output === "string" ? output : (output as string[])[0];
}

// flux-1.1-pro safety_tolerance is 1–6 (one step more permissive than flux-2-max's 1–5)
function intensityToProSafetyTolerance(intensity: number): number {
  if (intensity <= 1) return 2;
  if (intensity <= 3) return 3;
  if (intensity === 4) return 5;
  return 6;
}

export async function generateProImage(
  prompt: string,
  options: GenerateProImageOptions = {},
) {
  const {
    intensity = 1,
    aspectRatio = "2:3",
    outputFormat = "webp",
    outputQuality = 90,
    negativePrompt,
    seed,
    imagePrompt,
    promptUpsampling = false,
  } = options;

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: outputFormat,
    output_quality: outputQuality,
    safety_tolerance: intensityToProSafetyTolerance(intensity),
    prompt_upsampling: promptUpsampling,
  };

  if (negativePrompt) input.negative_prompt = negativePrompt;
  if (seed !== undefined) input.seed = seed;
  if (imagePrompt) input.image_prompt = imagePrompt;

  const replicate = getClient();
  const output = await replicate.run("black-forest-labs/flux-1.1-pro", { input });

  // flux-1.1-pro returns a single URI string
  return typeof output === "string" ? output : (output as string[])[0];
}
