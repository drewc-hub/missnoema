// file: src/lib/together.ts
import OpenAI from "openai";

let _together: OpenAI | undefined;

export function getTogether(): OpenAI {
  if (!_together) {
    if (!process.env.TOGETHER_API_KEY) {
      throw new Error("Missing TOGETHER_API_KEY");
    }
    _together = new OpenAI({
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: "https://api.together.xyz/v1",
    });
  }
  return _together;
}

// Override via TOGETHER_CHAT_MODEL env var if you want to try a different model
export const TOGETHER_CHAT_MODEL =
  process.env.TOGETHER_CHAT_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct-Turbo";
