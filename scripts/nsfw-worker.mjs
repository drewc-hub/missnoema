// FILE: scripts/nsfw-worker.mjs
/**
 * Polls Supabase gen_jobs queue and processes adult image/video jobs.
 *
 * Env:
 *  NEXT_PUBLIC_SUPABASE_URL
 *  SUPABASE_SERVICE_ROLE_KEY
 *  MODEL_SERVER_URL
 *  MODEL_SERVER_TOKEN (optional)
 *
 * Storage bucket:
 *  generated_adult (private)
 *
 * Provider contract (default):
 *  POST {MODEL_SERVER_URL}/generate  body: { kind, prompt }
 *  - returns binary (image/video) OR json: { url, contentType }
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadEnvFileIfPresent() {
  // Supports local runs via a repo-level "process.env" file.
  const p = path.join(__dirname, "..", "process.env");
  if (!fs.existsSync(p)) return;

  const text = fs.readFileSync(p, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let val = trimmed.slice(idx + 1).trim();
    val = val.replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFileIfPresent();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MODEL_SERVER_URL = process.env.MODEL_SERVER_URL;
const MODEL_SERVER_TOKEN = process.env.MODEL_SERVER_TOKEN || "";
const BUCKET = "generated_adult";

if (!SUPABASE_URL || !SERVICE_KEY || !MODEL_SERVER_URL) {
  console.error(
    "Missing env. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MODEL_SERVER_URL",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

function extFor(kind, mime) {
  if (kind === "video") {
    // a few common video content-types
    if (mime?.includes("mp4")) return "mp4";
    if (mime?.includes("webm")) return "webm";
    return "mp4";
  }
  if (mime?.includes("webp")) return "webp";
  if (mime?.includes("jpeg") || mime?.includes("jpg")) return "jpg";
  if (mime?.includes("png")) return "png";
  return "png";
}
const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const REPLICATE_IMAGE_MODEL =
  process.env.REPLICATE_IMAGE_MODEL || "black-forest-labs/flux-2-pro";
const REPLICATE_VIDEO_MODEL = process.env.REPLICATE_VIDEO_MODEL || "";
const REPLICATE_PREFER_WAIT = process.env.REPLICATE_PREFER_WAIT || "wait=60";
const REPLICATE_MAX_WAIT_MS = Number(
  process.env.REPLICATE_MAX_WAIT_MS || 6 * 60_000,
);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTerminalStatus(status) {
  return [
    "succeeded",
    "successful",
    "failed",
    "canceled",
    "cancelled",
  ].includes(String(status));
}

function pickFirstUrl(value) {
  if (!value) return null;

  if (typeof value === "string") {
    if (value.startsWith("http://") || value.startsWith("https://"))
      return value;
    if (value.startsWith("data:")) return value; // base64 data URL
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const u = pickFirstUrl(item);
      if (u) return u;
    }
    return null;
  }

  if (typeof value === "object") {
    for (const v of Object.values(value)) {
      const u = pickFirstUrl(v);
      if (u) return u;
    }
  }

  return null;
}

async function replicateCreatePrediction(model, input) {
  if (!REPLICATE_API_TOKEN) throw new Error("Missing REPLICATE_API_TOKEN");

  const url = `https://api.replicate.com/v1/models/${model}/predictions`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      "content-type": "application/json",
      prefer: REPLICATE_PREFER_WAIT,
    },
    body: JSON.stringify({ input }),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok)
    throw new Error(`Replicate create failed: ${res.status} ${text}`);

  return JSON.parse(text);
}

async function replicateGetPrediction(getUrlOrId) {
  if (!REPLICATE_API_TOKEN) throw new Error("Missing REPLICATE_API_TOKEN");

  const url = getUrlOrId.startsWith("http")
    ? getUrlOrId
    : `https://api.replicate.com/v1/predictions/${getUrlOrId}`;

  const res = await fetch(url, {
    headers: { authorization: `Bearer ${REPLICATE_API_TOKEN}` },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(`Replicate get failed: ${res.status} ${text}`);

  return JSON.parse(text);
}

async function fetchOutputBytes(outputUrlOrDataUrl) {
  if (outputUrlOrDataUrl.startsWith("data:")) {
    // data:<mime>;base64,<...>
    const match = /^data:([^;]+);base64,(.*)$/.exec(outputUrlOrDataUrl);
    if (!match) throw new Error("Unsupported data: URL");
    const [, mime, b64] = match;
    const bytes = Uint8Array.from(Buffer.from(b64, "base64"));
    return { bytes, contentType: mime };
  }

  const res = await fetch(outputUrlOrDataUrl);
  if (!res.ok) throw new Error(`Fetch output failed: ${res.status}`);
  const contentType =
    res.headers.get("content-type") || "application/octet-stream";
  const bytes = new Uint8Array(await res.arrayBuffer());
  return { bytes, contentType };
}

async function callModelServer(job) {
  // Use Replicate for official models (don’t hit replicate.com web URLs)
  const model =
    job.kind === "video" ? REPLICATE_VIDEO_MODEL || "" : REPLICATE_IMAGE_MODEL;

  if (!model) {
    throw new Error("Missing REPLICATE_VIDEO_MODEL for video jobs");
  }

  const prediction = await replicateCreatePrediction(model, {
    prompt: job.prompt,
  });

  // If Prefer: wait returned output immediately, great. Otherwise poll.
  let current = prediction;
  const started = Date.now();
  while (
    !isTerminalStatus(current.status) &&
    Date.now() - started < REPLICATE_MAX_WAIT_MS
  ) {
    await sleep(1500);
    current = await replicateGetPrediction(current.urls?.get || current.id);
  }

  if (!isTerminalStatus(current.status)) {
    throw new Error(
      `Replicate timeout after ${REPLICATE_MAX_WAIT_MS}ms (status=${current.status})`,
    );
  }

  if (current.status === "failed" || current.error) {
    throw new Error(`Replicate failed: ${current.error || "unknown error"}`);
  }

  const outputUrl = pickFirstUrl(current.output);
  if (!outputUrl) {
    throw new Error(
      `Replicate returned no file URL. Output: ${JSON.stringify(current.output).slice(0, 400)}`,
    );
  }

  return await fetchOutputBytes(outputUrl);
}
async function failJob(jobId, message) {
  const { data, error } = await supabase.rpc("fail_job", {
    p_id: jobId,
    p_error: message ?? "unknown",
  });
  if (error) throw new Error(`fail_job failed: ${error.message}`);
  return data;
}

async function processClaimed(job) {
  // Generate
  const { bytes, contentType } = await callModelServer(job);

  // Upload
  const ext = extFor(job.kind, contentType);
  const objectPath = `${job.user_id}/${job.id}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, bytes, {
      contentType,
      upsert: true, // overwrite if retried
    });
  if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

  // Mark completed atomically
  await completeJob(job.id, BUCKET, objectPath, contentType);
}

async function tickOnce() {
  let processed = 0;
  // Process up to N claimed jobs per tick
  const maxPerTick = Number(process.env.WORKER_MAX_PER_TICK || 3);

  for (let i = 0; i < maxPerTick; i++) {
    const job = await claimNext();
    if (!job) break;

    try {
      await processClaimed(job);
      processed++;
    } catch (e) {
      const msg = e && e.message ? e.message : "Failed";
      try {
        await failJob(job.id, msg);
      } catch (inner) {
        console.error(
          "Failed to mark job as failed",
          job.id,
          inner?.message || inner,
        );
      }
      console.error("Job failed", job.id, msg);
    }
  }
  return { processed };
}

// Basic retry with backoff wrapper for the whole tick
async function main() {
  const maxRetries = Number(process.env.WORKER_MAX_TICK_RETRIES || 2);
  const baseDelayMs = Number(process.env.WORKER_RETRY_BASE_MS || 500);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const r = await tickOnce();
      console.log(JSON.stringify({ ok: true, ...r }));
      return;
    } catch (e) {
      const msg = e?.message || "tickOnce error";
      console.error("tickOnce failed", { attempt, msg });
      if (attempt === maxRetries) {
        console.log(JSON.stringify({ ok: false, error: msg }));
        return;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}

(async () => {
  await main();
})();
