const LEONARDO_BASE_URL = "https://cloud.leonardo.ai/api/rest/v1";

type LeonardoGenerationCreateResponse = {
  sdGenerationJob?: {
    generationId?: string;
  };
  generationId?: string;
};

type LeonardoGeneratedImage = {
  url?: string | null;
  id?: string | null;
  nsfw?: boolean | null;
};

type LeonardoGenerationResponse = {
  generations_by_pk?: {
    id?: string;
    status?: string | null;
    generated_images?: LeonardoGeneratedImage[] | null;
  } | null;
};

export type LeonardoImageOptions = {
  width?: number;
  height?: number;
  numImages?: number;
  modelId?: string;
  styleUUID?: string;
  negativePrompt?: string;
  alchemy?: boolean;
  ultra?: boolean;
  contrast?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  public?: boolean;
  pollAttempts?: number;
  pollIntervalMs?: number;
};

function getApiKey() {
  const key = process.env.LEONARDO_API_KEY?.trim();
  if (!key) throw new Error("Missing LEONARDO_API_KEY");
  return key;
}

async function leonardoFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${LEONARDO_BASE_URL}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${getApiKey()}`,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Leonardo API failed (${res.status}): ${body || res.statusText}`);
  }

  return (await res.json()) as T;
}

function generationIdFromCreate(payload: LeonardoGenerationCreateResponse) {
  return payload.sdGenerationJob?.generationId ?? payload.generationId ?? null;
}

function firstImageUrl(payload: LeonardoGenerationResponse) {
  const images = payload.generations_by_pk?.generated_images ?? [];
  return images.find((image) => typeof image.url === "string" && image.url)?.url ?? null;
}

export async function randomLeonardoPrompt() {
  return leonardoFetch<unknown>("/prompt/random", { method: "POST" });
}

export async function generateLeonardoImage(
  prompt: string,
  options: LeonardoImageOptions = {},
) {
  const {
    width = 768,
    height = 1024,
    numImages = 1,
    modelId = process.env.LEONARDO_IMAGE_MODEL_ID || "7b592283-e8a7-4c5a-9ba6-d18c31f258b9",
    styleUUID = process.env.LEONARDO_STYLE_UUID || "111dc692-d470-4eec-b791-3475abac4c46",
    negativePrompt =
      "watermark, text, logo, signature, blurry, deformed, bad anatomy, low quality, extra limbs, missing limbs",
    alchemy = false,
    ultra = false,
    contrast = 3.5,
    guidanceScale = 7,
    numInferenceSteps = 20,
    public: isPublic = false,
    pollAttempts = 90,
    pollIntervalMs = 2000,
  } = options;

  const created = await leonardoFetch<LeonardoGenerationCreateResponse>("/generations", {
    method: "POST",
    body: JSON.stringify({
      alchemy,
      contrast,
      guidance_scale: guidanceScale,
      height,
      modelId,
      negative_prompt: negativePrompt,
      num_images: Math.max(1, Math.min(numImages, 4)),
      num_inference_steps: numInferenceSteps,
      prompt,
      public: isPublic,
      styleUUID,
      ultra,
      width,
    }),
  });

  const generationId = generationIdFromCreate(created);
  if (!generationId) {
    throw new Error(`Leonardo returned no generation ID: ${JSON.stringify(created)}`);
  }

  for (let attempt = 0; attempt < pollAttempts; attempt += 1) {
    const generation = await leonardoFetch<LeonardoGenerationResponse>(
      `/generations/${encodeURIComponent(generationId)}`,
      { method: "GET" },
    );
    const status = generation.generations_by_pk?.status?.toUpperCase() ?? "";
    const url = firstImageUrl(generation);

    if (url && (status === "COMPLETE" || status === "COMPLETED" || status === "")) {
      return url;
    }

    if (status === "FAILED") {
      throw new Error(`Leonardo generation failed: ${JSON.stringify(generation)}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Leonardo generation timed out: ${generationId}`);
}

export async function generateLeonardoImageBytes(
  prompt: string,
  options: LeonardoImageOptions = {},
) {
  const url = await generateLeonardoImage(prompt, options);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Leonardo image download failed (${res.status}): ${res.statusText}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/jpeg";
  return { bytes, contentType };
}
