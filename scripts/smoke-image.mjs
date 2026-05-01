/**
 * scripts/smoke-image.mjs
 *
 * Run:
 *   OPENAI_API_KEY="sk-..." node scripts/smoke-image.mjs
 *
 * Or with dotenv:
 *   node -r dotenv/config scripts/smoke-image.mjs
 */
import fs from "node:fs";

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
  throw new Error("Missing OPENAI_API_KEY in environment.");
}

const res = await fetch("https://api.openai.com/v1/images", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: "gpt-image-1",
    prompt:
      "A cute robot holding a sign that says 'hello' in a flat icon style",
    size: "1024x1024",
  }),
});

const data = await res.json();

if (!res.ok) {
  console.error("HTTP", res.status, data);
  process.exit(1);
}

const b64 = data?.data?.[0]?.b64_json;
if (!b64) {
  console.error("No b64_json returned:", data);
  process.exit(1);
}

fs.mkdirSync("out", { recursive: true });
fs.writeFileSync("out/test.png", Buffer.from(b64, "base64"));
console.log("Wrote out/test.png");
