// file: scripts/print-env.mjs
import crypto from "crypto";

function fp(v = "") {
  const cleaned = String(v).replace(/\s+/g, "");
  return cleaned
    ? crypto.createHash("sha256").update(cleaned).digest("hex").slice(0, 8)
    : null;
}

console.log({
  cwd: process.cwd(),
  NODE_ENV: process.env.NODE_ENV,
  REDIS_URL: process.env.REDIS_URL,
  NO_QUEUE: process.env.NO_QUEUE,
  hasReplicate: !!process.env.REPLICATE_API_TOKEN,
  replicate_fp8: fp(process.env.REPLICATE_API_TOKEN),
  hasOpenAI: !!process.env.OPENAI_API_KEY,
  openai_fp8: fp(process.env.OPENAI_API_KEY),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
});
