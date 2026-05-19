// file: src/lib/together.ts
import OpenAI from "openai";
import { getOpenAI } from "@/lib/openai";

// Together AI client (kept as fallback if credits are available)
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

// OpenRouter client — free models, adult content allowed
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

// Default free OpenRouter model — override via OPENROUTER_MODEL env var
export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free";

const OPENROUTER_FALLBACK =
  process.env.OPENROUTER_FALLBACK_MODEL ?? "deepseek/deepseek-chat:free";

/** Priority: OpenRouter → Together AI → OpenAI */
export function getChatClient(): { client: OpenAI; model: string } {
  if (process.env.OPENROUTER_API_KEY) {
    return { client: getOpenRouter(), model: OPENROUTER_MODEL };
  }
  if (process.env.TOGETHER_API_KEY) {
    return { client: getTogether(), model: TOGETHER_CHAT_MODEL };
  }
  return { client: getOpenAI(), model: "gpt-4o-mini" };
}

// repetition_penalty is native to Llama — inject when using a Llama model
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function llamaExtras(model: string): any {
  return /llama/i.test(model) ? { repetition_penalty: 1.25 } : {};
}

type ChatParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, "model" | "stream">;
type StreamParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsStreaming, "model" | "stream">;

function isRecoverable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 400 || status === 402 || status === 429 || (!!status && status >= 500);
}

/** Chat completion — tries primary model, then fallback, then OpenAI. */
export async function chatCompletion(params: ChatParams): Promise<OpenAI.Chat.ChatCompletion> {
  if (process.env.OPENROUTER_API_KEY) {
    const client = getOpenRouter();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_MODEL, stream: false });
    } catch (err: unknown) {
      if (!isRecoverable(err)) throw err;
      console.warn(`[together] primary model failed (${(err as { status?: number })?.status}), trying fallback ${OPENROUTER_FALLBACK}`);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_FALLBACK, stream: false });
      } catch {
        // fall through to OpenAI
      }
    }
  } else if (process.env.TOGETHER_API_KEY) {
    try {
      const client = getTogether();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client.chat.completions.create as any)({ ...params, ...llamaExtras(TOGETHER_CHAT_MODEL), model: TOGETHER_CHAT_MODEL, stream: false });
    } catch (err: unknown) {
      if (!isRecoverable(err)) throw err;
    }
  }
  console.warn(`[together] falling back to OpenAI gpt-4o-mini`);
  return await getOpenAI().chat.completions.create({ ...params, model: "gpt-4o-mini", stream: false });
}

/** Streaming chat completion — tries primary model, then fallback, then OpenAI. */
export async function chatCompletionStream(params: StreamParams): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
  if (process.env.OPENROUTER_API_KEY) {
    const client = getOpenRouter();
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_MODEL, stream: true });
    } catch (err: unknown) {
      if (!isRecoverable(err)) throw err;
      console.warn(`[together] stream primary failed, trying ${OPENROUTER_FALLBACK}`);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_FALLBACK, stream: true });
      } catch {
        // fall through
      }
    }
  }
  console.warn(`[together] stream falling back to OpenAI gpt-4o-mini`);
  return await getOpenAI().chat.completions.create({ ...params, model: "gpt-4o-mini", stream: true });
}
