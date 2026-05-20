import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free";

const OPENROUTER_FALLBACK =
  process.env.OPENROUTER_FALLBACK_MODEL ?? "deepseek/deepseek-chat:free";

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

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  return status === 429 || status === 402 || (!!status && status >= 500);
}

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
  // Try primary model
  try {
    const result = streamText(buildStreamParams(OPENROUTER_MODEL, systemPrompt, messages));
    for await (const chunk of result.textStream) {
      yield chunk;
    }
    return;
  } catch (err: unknown) {
    if (!isRetryable(err)) throw err;
    console.warn(`[ai-client] ${OPENROUTER_MODEL} failed (${(err as { status?: number })?.status}), trying fallback`);
  }

  // Try fallback model
  try {
    const result = streamText(buildStreamParams(OPENROUTER_FALLBACK, systemPrompt, messages));
    for await (const chunk of result.textStream) {
      yield chunk;
    }
    return;
  } catch (err: unknown) {
    console.error(`[ai-client] fallback model ${OPENROUTER_FALLBACK} also failed:`, err);
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
    if (!isRetryable(err)) throw err;
    console.warn(`[ai-client] generate fallback to ${OPENROUTER_FALLBACK}`);
    try {
      return await tryGenerate(OPENROUTER_FALLBACK);
    } catch {
      return "I'm here with you.";
    }
  }
}
