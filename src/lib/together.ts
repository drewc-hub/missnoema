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

type ChatParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, "model" | "stream">;
type StreamParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsStreaming, "model" | "stream">;

const usingTogether = () => Boolean(process.env.TOGETHER_API_KEY);

// Llama-native anti-repetition param — injected when using Together AI
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const llamaExtras: any = { repetition_penalty: 1.15 };

const BASE_TOGETHER_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

function isTogetherRecoverable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  // 400 = endpoint not running / model invalid; 402 = credit limit
  return status === 400 || status === 402;
}

/** Chat completion with automatic fallback on Together AI errors. */
export async function chatCompletion(params: ChatParams): Promise<OpenAI.Chat.ChatCompletion> {
  const { client, model } = getChatClient();
  const extra = usingTogether() ? llamaExtras : {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (client.chat.completions.create as any)({ ...params, ...extra, model, stream: false });
  } catch (err: unknown) {
    if (!isTogetherRecoverable(err)) throw err;
    const status = (err as { status?: number })?.status;
    // 400 (endpoint down) → retry with base model; 402 (no credits) → OpenAI
    if (status === 400 && model !== BASE_TOGETHER_MODEL) {
      console.warn("Together AI fine-tune endpoint down, falling back to base model");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (getTogether().chat.completions.create as any)({ ...params, ...llamaExtras, model: BASE_TOGETHER_MODEL, stream: false });
    }
    console.warn("Together AI unavailable, falling back to OpenAI");
    return await getOpenAI().chat.completions.create({ ...params, model: "gpt-4o-mini", stream: false });
  }
}

/** Streaming chat completion with automatic fallback on Together AI errors. */
export async function chatCompletionStream(params: StreamParams): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
  const { client, model } = getChatClient();
  const extra = usingTogether() ? llamaExtras : {};
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (client.chat.completions.create as any)({ ...params, ...extra, model, stream: true });
  } catch (err: unknown) {
    if (!isTogetherRecoverable(err)) throw err;
    const status = (err as { status?: number })?.status;
    if (status === 400 && model !== BASE_TOGETHER_MODEL) {
      console.warn("Together AI fine-tune endpoint down, falling back to base model");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (getTogether().chat.completions.create as any)({ ...params, ...llamaExtras, model: BASE_TOGETHER_MODEL, stream: true });
    }
    console.warn("Together AI unavailable, falling back to OpenAI");
    return await getOpenAI().chat.completions.create({ ...params, model: "gpt-4o-mini", stream: true });
  }
}
