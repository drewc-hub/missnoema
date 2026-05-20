// file: src/lib/together.ts
import OpenAI from "openai";

// Together AI client
let _together: OpenAI | undefined;
export function getTogether(): OpenAI {
  if (!_together) {
    if (!process.env.TOGETHER_API_KEY) throw new Error("Missing TOGETHER_API_KEY");
    _together = new OpenAI({
      apiKey: process.env.TOGETHER_API_KEY,
      baseURL: "https://api.together.xyz/v1",
    });
  }
  return _together;
}

// OpenRouter client
let _openrouter: OpenAI | undefined;
export function getOpenRouter(): OpenAI {
  if (!_openrouter) {
    if (!process.env.OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY");
    _openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "https://missnoema.com",
        "X-Title": "Noema AI",
      },
    });
  }
  return _openrouter;
}

export const TOGETHER_CHAT_MODEL =
  process.env.TOGETHER_CHAT_MODEL ?? "meta-llama/Llama-3.3-70B-Instruct-Turbo";

export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free";

const OPENROUTER_FALLBACK =
  process.env.OPENROUTER_FALLBACK_MODEL ?? "deepseek/deepseek-chat:free";

// repetition_penalty is native to Llama — inject when using a Llama model
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function llamaExtras(model: string): any {
  return /llama/i.test(model) ? { repetition_penalty: 1.25 } : {};
}

type ChatParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, "model" | "stream">;
type StreamParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsStreaming, "model" | "stream">;

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 402 || status === 429 || (!!status && status >= 500);
}

/** Chat completion — OpenRouter primary → OpenRouter fallback → Together → error */
export async function chatCompletion(params: ChatParams): Promise<OpenAI.Chat.ChatCompletion> {
  if (process.env.OPENROUTER_API_KEY) {
    const client = getOpenRouter();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_MODEL, stream: false });
    } catch (err: unknown) {
      if (!isRetryable(err)) throw err;
      console.warn(`[together] ${OPENROUTER_MODEL} failed (${(err as { status?: number })?.status}), trying ${OPENROUTER_FALLBACK}`);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_FALLBACK, stream: false });
    } catch (err: unknown) {
      if (!isRetryable(err)) throw err;
      console.warn(`[together] fallback also failed`);
    }
  }

  if (process.env.TOGETHER_API_KEY) {
    const client = getTogether();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (client.chat.completions.create as any)({ ...params, ...llamaExtras(TOGETHER_CHAT_MODEL), model: TOGETHER_CHAT_MODEL, stream: false });
  }

  throw new Error("No AI provider available. Set OPENROUTER_API_KEY or TOGETHER_API_KEY.");
}

/** Streaming chat completion — same fallback chain as chatCompletion */
export async function chatCompletionStream(params: StreamParams): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
  if (process.env.OPENROUTER_API_KEY) {
    const client = getOpenRouter();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_MODEL, stream: true });
    } catch (err: unknown) {
      if (!isRetryable(err)) throw err;
      console.warn(`[together] stream ${OPENROUTER_MODEL} failed, trying ${OPENROUTER_FALLBACK}`);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_FALLBACK, stream: true });
    } catch (err: unknown) {
      if (!isRetryable(err)) throw err;
      console.warn(`[together] stream fallback also failed`);
    }
  }

  if (process.env.TOGETHER_API_KEY) {
    const client = getTogether();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (client.chat.completions.create as any)({ ...params, ...llamaExtras(TOGETHER_CHAT_MODEL), model: TOGETHER_CHAT_MODEL, stream: true });
  }

  throw new Error("No AI provider available. Set OPENROUTER_API_KEY or TOGETHER_API_KEY.");
}
