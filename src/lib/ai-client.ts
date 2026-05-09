// file: src/lib/ai-client.ts
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, generateText } from "ai";

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "mistralai/mistral-nemo";

let _provider: ReturnType<typeof createOpenAI> | undefined;

function getProvider() {
  if (!_provider) {
    if (!process.env.OPENROUTER_API_KEY) throw new Error("Missing OPENROUTER_API_KEY");
    _provider = createOpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
      headers: {
        "HTTP-Referer": "https://missnoema.com",
        "X-Title": "Noema AI",
      },
    });
  }
  return _provider;
}

type Msg = { role: "user" | "assistant"; content: string };

const streamSettings = {
  providerOptions: { openai: { temperature: 0.95, max_tokens: 1024 } },
} as const;

const generateSettings = {
  providerOptions: { openai: { temperature: 1.05, max_tokens: 1024 } },
} as const;

/** Streaming companion reply — returns async iterable of text chunks. */
export function companionStream(
  systemPrompt: string,
  messages: Msg[],
): AsyncIterable<string> {
  const result = streamText({
    model: getProvider().chat(OPENROUTER_MODEL),
    system: systemPrompt,
    messages,
    ...streamSettings,
  });
  return result.textStream;
}

/** Single-shot generation for rerun / rewrite. */
export async function companionGenerate(
  systemPrompt: string,
  messages: Msg[],
): Promise<string> {
  const result = await generateText({
    model: getProvider().chat(OPENROUTER_MODEL),
    system: systemPrompt,
    messages,
    ...generateSettings,
  });
  return result.text.trim() || "I'm here with you.";
}
