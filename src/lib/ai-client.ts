import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free";

// Fallback if primary model fails (rate-limit, quota, or model unavailable)
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

function streamParams(model: string, systemPrompt: string, messages: Msg[]) {
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
  try {
    const result = streamText(streamParams(OPENROUTER_MODEL, systemPrompt, messages));
    for await (const chunk of result.textStream) {
      yield chunk;
    }
  } catch (err: unknown) {
    const status = (err as { status?: number })?.status;
    // On rate-limit, quota, or 5xx — try the fallback model once
    if (status === 429 || status === 402 || (status && status >= 500)) {
      console.warn(`[ai-client] model ${OPENROUTER_MODEL} failed (${status}), falling back to ${OPENROUTER_FALLBACK}`);
      const result = streamText(streamParams(OPENROUTER_FALLBACK, systemPrompt, messages));
      for await (const chunk of result.textStream) {
        yield chunk;
      }
    } else {
      throw err;
    }
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
    if (status === 429 || status === 402 || (status && status >= 500)) {
      console.warn(`[ai-client] generate fallback to ${OPENROUTER_FALLBACK}`);
      return await tryGenerate(OPENROUTER_FALLBACK);
    }
    throw err;
  }
}
