import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash:free";

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

export function companionStream(
  systemPrompt: string,
  messages: Msg[],
): AsyncIterable<string> {
  const result = streamText({
    model: getProvider().chat(OPENROUTER_MODEL),
    system: systemPrompt,
    messages,
    temperature: 0.75,
    topP: 0.9,
    maxOutputTokens: 1400,
    frequencyPenalty: 0.7,
    presencePenalty: 0.35,
  });

  return result.textStream;
}

export async function companionGenerate(
  systemPrompt: string,
  messages: Msg[],
): Promise<string> {
  const result = await generateText({
    model: getProvider().chat(OPENROUTER_MODEL),
    system: systemPrompt,
    messages,
    temperature: 0.85,
    maxOutputTokens: 1400,
    frequencyPenalty: 0.6,
    presencePenalty: 0.4,
  });

  return result.text.trim() || "I'm here with you.";
}
