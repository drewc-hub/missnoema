import fs from "node:fs/promises";
import path from "node:path";

function env(name, fallback) {
  const v = process.env[name];
  if (v && v.trim()) return v.trim();
  if (fallback !== undefined) return fallback;
  throw new Error(`Missing env var: ${name}`);
}

function parseJsonEnv(name) {
  const raw = process.env[name];
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {};
    return parsed;
  } catch {
    throw new Error(`${name} must be valid JSON`);
  }
}

async function replicateRequest(pathname, init = {}) {
  const token = env("REPLICATE_API_TOKEN").replace(/\s+/g, "");

  const res = await fetch(`https://api.replicate.com${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) {
    throw new Error(`Replicate request failed: ${res.status} ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

function extractOutputUrl(output) {
  if (!output) return null;
  if (typeof output === "string") return output;

  if (Array.isArray(output)) {
    for (const item of output) {
      const found = extractOutputUrl(item);
      if (found) return found;
    }
    return null;
  }

  if (typeof output === "object") {
    if (typeof output.url === "string") return output.url;
    for (const value of Object.values(output)) {
      const found = extractOutputUrl(value);
      if (found) return found;
    }
  }

  return null;
}

async function waitForPrediction(id, maxAttempts = 240, sleepMs = 1500) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const prediction = await replicateRequest(`/v1/predictions/${id}`, {
      method: "GET",
      headers: {},
    });

    console.log("[smoke] poll", {
      id,
      status: prediction?.status,
    });

    const status = String(prediction?.status ?? "");
    if (status === "succeeded") return prediction;
    if (status === "failed" || status === "canceled") {
      throw new Error(
        `Prediction ${status}: ${prediction?.error ?? "unknown error"}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, sleepMs));
  }

  throw new Error("Prediction timed out");
}

async function main() {
  const model = env(
    "SMOKE_IMAGE_MODEL",
    env(
      "SAFE_IMAGE_MODEL",
      env("ADULT_IMAGE_MODEL", "black-forest-labs/flux-2-pro"),
    ),
  );
  const prompt = env(
    "SMOKE_PROMPT",
    "a simple photo of a red apple on a wooden table",
  );
  const aspectRatio = env("REPLICATE_IMAGE_ASPECT_RATIO", "1:1");
  const extra = parseJsonEnv("REPLICATE_IMAGE_INPUT_JSON");

  console.log("[smoke] starting", { model, prompt, aspectRatio });

  const created = await replicateRequest("/v1/predictions", {
    method: "POST",
    body: JSON.stringify({
      version: model,
      input: {
        prompt,
        aspect_ratio: aspectRatio,
        ...extra,
      },
    }),
  });

  console.log("[smoke] created", {
    id: created?.id,
    status: created?.status,
    get: created?.urls?.get,
    web: created?.urls?.web,
  });

  const done = await waitForPrediction(String(created.id));
  const outputUrl = extractOutputUrl(done.output);

  if (!outputUrl) {
    throw new Error(
      `No output URL in prediction output: ${JSON.stringify(done.output).slice(0, 800)}`,
    );
  }

  console.log("[smoke] output url", outputUrl);

  const res = await fetch(outputUrl);
  if (!res.ok) {
    throw new Error(
      `Failed to download output: ${res.status} ${res.statusText}`,
    );
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType =
    res.headers.get("content-type") ?? "application/octet-stream";
  const ext = contentType.includes("image/png")
    ? "png"
    : contentType.includes("image/jpeg")
      ? "jpg"
      : contentType.includes("image/webp")
        ? "webp"
        : contentType.includes("video/mp4")
          ? "mp4"
          : contentType.includes("video/webm")
            ? "webm"
            : "bin";

  const outDir = path.resolve("tmp");
  const outFile = path.join(outDir, `replicate-smoke-${created.id}.${ext}`);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(outFile, buffer);

  console.log("[smoke] saved", {
    file: outFile,
    bytes: buffer.byteLength,
    contentType,
    web: done?.urls?.web ?? null,
  });
}

main().catch((err) => {
  console.error("[smoke] fatal", err);
  process.exit(1);
});
