// OpenRouter client — Together AI removed
import OpenAI from "openai";

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

export const OPENROUTER_MODEL =
    process.env.OPENROUTER_MODEL ?? "mistralai/mistral-nemo";

export const OPENROUTER_FALLBACK =
    process.env.OPENROUTER_FALLBACK_MODEL ?? "mistralai/mistral-nemo";

type ChatParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsNonStreaming, "model" | "stream">;
type StreamParams = Omit<OpenAI.Chat.ChatCompletionCreateParamsStreaming, "model" | "stream">;

/** Non-streaming completion — primary model → fallback */
export async function chatCompletion(params: ChatParams): Promise<OpenAI.Chat.ChatCompletion> {
    const client = getOpenRouter();
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_MODEL, stream: false });
    } catch (err: unknown) {
        console.warn(`[openrouter] ${OPENROUTER_MODEL} failed (${(err as { status?: number })?.status ?? "unknown"}), trying fallback`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_FALLBACK, stream: false });
}

/** Streaming completion — primary model → fallback */
export async function chatCompletionStream(params: StreamParams): Promise<AsyncIterable<OpenAI.Chat.ChatCompletionChunk>> {
    const client = getOpenRouter();
    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_MODEL, stream: true });
    } catch (err: unknown) {
        console.warn(`[openrouter] stream ${OPENROUTER_MODEL} failed, trying fallback`);
        if ((err as { status?: number })?.status && !isRetryable(err)) throw err;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (client.chat.completions.create as any)({ ...params, model: OPENROUTER_FALLBACK, stream: true });
}

function isRetryable(err: unknown): boolean {
    const status = (err as { status?: number })?.status;
    return status === 402 || status === 429 || (!!status && status >= 500);
}
