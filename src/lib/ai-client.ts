import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free";

// Reliable fallback — used whenever the primary model fails for any reason
const OPENROUTER_FALLBACK =
  process.env.OPENROUTER_FALLBACK_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free";

let provider: ReturnType<typeof createOpenAI> | undefined;

export function getProvider() {
  if (!provider) {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }
    provider = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        "HTTP-Referer": "https://missnoema.com",
        "X-Title": "Noema AI",
      },
    });
  }
  return provider;
}

type Msg = {
  role: "user" | "assistant";
  content: string;
};

function buildStreamParams(model: string, systemPrompt: string, messages: Msg[]) {
  return {
    model: getProvider().chat(model),
    system: systemPrompt,
    messages,
    temperature: 0.75,
    topP: 0.9,
    maxOutputTokens: 1400,
    frequencyPenalty: 0.7,
    presencePenalty: 0.35,
  } as const;
}

export async function* companionStream(
  systemPrompt: string,
  messages: Msg[],
): AsyncGenerator<string> {
  // Try primary model — fall back on ANY error (404, 422, 429, 5xx, network)
  try {
    const result = streamText(buildStreamParams(OPENROUTER_MODEL, systemPrompt, messages));
    for await (const chunk of result.textStream) {
      yield chunk;
    }
    return;
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    console.warn(`[ai-client] primary model ${OPENROUTER_MODEL} failed (status=${status ?? "unknown"}), trying fallback`);
  }

  // Try fallback model
  try {
    const result = streamText(buildStreamParams(OPENROUTER_FALLBACK, systemPrompt, messages));
    for await (const chunk of result.textStream) {
      yield chunk;
    }
    return;
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    console.error(`[ai-client] fallback ${OPENROUTER_FALLBACK} also failed (status=${status ?? "unknown"})`, err);
    yield "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

export async function companionGenerate(
  systemPrompt: string,
  messages: Msg[],
): Promise<string> {
  const tryGenerate = async (model: string) => {
    const result = await generateText({
      model: getProvider().chat(model),
      system: systemPrompt,
      messages,
      temperature: 0.85,
      maxOutputTokens: 1400,
      frequencyPenalty: 0.6,
      presencePenalty: 0.4,
    });
    return result.text.trim() || "I'm here with you.";
  };

  try {
    return await tryGenerate(OPENROUTER_MODEL);
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    console.warn(`[ai-client] generate primary failed (status=${status ?? "unknown"}), trying fallback`);
    try {
      return await tryGenerate(OPENROUTER_FALLBACK);
    } catch {
      return "I'm here with you.";
    }
  }
}
