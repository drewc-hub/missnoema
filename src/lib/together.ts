// file: src/lib/together.ts
import OpenAI from "openai";
import { getOpenAI } from "./openai";

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

export const TOGETHER_CHAT_MODEL =
  process.env.TOGETHER_CHAT_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct-Turbo";

/** Returns Together AI client + model, or falls back to OpenAI gpt-4o-mini if key not set. */
export function getChatClient(): { client: OpenAI; model: string } {
  if (process.env.TOGETHER_API_KEY) {
    return { client: getTogether(), model: TOGETHER_CHAT_MODEL };
  }
  return { client: getOpenAI(), model: "gpt-4o-mini" };
}
