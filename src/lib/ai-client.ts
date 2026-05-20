// Streaming: Replicate primary → OpenRouter fallback
import Replicate from "replicate";
import { getOpenRouter, OPENROUTER_MODEL, OPENROUTER_FALLBACK } from "@/lib/together";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

const REPLICATE_CHAT_MODEL =
  process.env.REPLICATE_CHAT_MODEL ??
  "jeffgreen311/eve-v2-unleashed:b25d26aa7b180e78f88cba5f941a95ae87d198473e88c21d02f62d6ec60ba28d";

function getReplicateClient(): Replicate {
  const token = (process.env.REPLICATE_API_TOKEN ?? "").replace(/\s+/g, "");
  if (!token) throw new Error("Missing REPLICATE_API_TOKEN");
  return new Replicate({ auth: token });
}

// Format chat history into a single prompt string (Human/Assistant turns)
function buildReplicatePrompt(messages: Msg[]): string {
  const parts: string[] = [];
  for (const msg of messages) {
    parts.push(msg.role === "user" ? `Human: ${msg.content}` : `Assistant: ${msg.content}`);
  }
  parts.push("Assistant:");
  return parts.join("\n\n");
}

async function* streamReplicate(
  systemPrompt: string,
  messages: Msg[],
): AsyncGenerator<string> {
  const client = getReplicateClient();
  const stream = client.stream(REPLICATE_CHAT_MODEL as `${string}/${string}:${string}`, {
    input: {
      system_prompt: systemPrompt,
      prompt: buildReplicatePrompt(messages),
      max_new_tokens: 1400,
      temperature: 0.75,
      top_p: 0.9,
    },
  });
  for await (const event of stream) {
    if (event.event === "output" && event.data) yield event.data;
  }
}

const OPENROUTER_STREAM_PARAMS = {
  max_tokens: 1400,
  temperature: 0.75,
  top_p: 0.9,
  frequency_penalty: 0.7,
  presence_penalty: 0.35,
} as const;

async function* streamOpenRouter(
  model: string,
  systemPrompt: string,
  messages: Msg[],
): AsyncGenerator<string> {
  const client = getOpenRouter();
  const allMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await (client.chat.completions.create as any)({
    ...OPENROUTER_STREAM_PARAMS,
    model,
    messages: allMessages,
    stream: true,
  });
  for await (const chunk of stream) {
    const text: string = chunk.choices?.[0]?.delta?.content ?? "";
    if (text) yield text;
  }
}

export async function* companionStream(
  systemPrompt: string,
  messages: Msg[],
): AsyncGenerator<string> {
  // Try Replicate first
  try {
    let hadChunks = false;
    for await (const chunk of streamReplicate(systemPrompt, messages)) {
      hadChunks = true;
      yield chunk;
    }
    if (hadChunks) return;
    console.warn("[ai-client] Replicate returned empty stream, trying OpenRouter");
  } catch (err: unknown) {
    console.warn("[ai-client] Replicate failed:", (err as Error)?.message ?? err);
  }

  // Try OpenRouter primary
  try {
    let hadChunks = false;
    for await (const chunk of streamOpenRouter(OPENROUTER_MODEL, systemPrompt, messages)) {
      hadChunks = true;
      yield chunk;
    }
    if (hadChunks) return;
    console.warn(`[ai-client] OpenRouter ${OPENROUTER_MODEL} returned empty stream, trying fallback`);
  } catch (err: unknown) {
    console.warn(`[ai-client] OpenRouter ${OPENROUTER_MODEL} failed:`, (err as Error)?.message ?? err);
  }

  // Try OpenRouter fallback
  try {
    for await (const chunk of streamOpenRouter(OPENROUTER_FALLBACK, systemPrompt, messages)) {
      yield chunk;
    }
    return;
  } catch (err: unknown) {
    console.error(`[ai-client] All providers failed:`, (err as Error)?.message ?? err);
    yield "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

export async function companionGenerate(
  systemPrompt: string,
  messages: Msg[],
): Promise<string> {
  // Try Replicate (non-streaming via run)
  try {
    const client = getReplicateClient();
    const output = await client.run(REPLICATE_CHAT_MODEL as `${string}/${string}:${string}`, {
      input: {
        system_prompt: systemPrompt,
        prompt: buildReplicatePrompt(messages),
        max_new_tokens: 1400,
        temperature: 0.75,
        top_p: 0.9,
      },
    });
    // Replicate LLMs return string[] of tokens — join them
    const text = Array.isArray(output) ? (output as string[]).join("").trim() : String(output ?? "").trim();
    if (text) return text;
    console.warn("[ai-client] Replicate generate returned empty");
  } catch (err: unknown) {
    console.warn("[ai-client] Replicate generate failed:", (err as Error)?.message ?? err);
  }

  // Fall back to OpenRouter
  const openrouterClient = getOpenRouter();
  const allMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];
  const tryOpenRouter = async (model: string): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (openrouterClient.chat.completions.create as any)({
      ...OPENROUTER_STREAM_PARAMS,
      model,
      messages: allMessages,
      stream: false,
    });
    return (res.choices?.[0]?.message?.content ?? "").trim();
  };

  try {
    const text = await tryOpenRouter(OPENROUTER_MODEL);
    return text || "I'm here with you.";
  } catch (err: unknown) {
    console.warn(`[ai-client] generate OpenRouter primary failed:`, (err as Error)?.message ?? err);
    try {
      const text = await tryOpenRouter(OPENROUTER_FALLBACK);
      return text || "I'm here with you.";
    } catch {
      return "I'm here with you.";
    }
  }
}

// Returns a Vercel AI SDK-compatible provider (used by generateText callers)
export function getProvider() {
  const { createOpenAI } = require("@ai-sdk/openai");
  return createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
  });
}
