// Streaming via raw openai client → OpenRouter (free models only)
import { getOpenRouter, OPENROUTER_MODEL, OPENROUTER_FALLBACK } from "@/lib/together";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

const STREAM_PARAMS = {
  max_tokens: 1400,
  temperature: 0.75,
  top_p: 0.9,
  frequency_penalty: 0.7,
  presence_penalty: 0.35,
} as const;

async function* streamModel(
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
    ...STREAM_PARAMS,
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
  // Try primary model
  try {
    let hadChunks = false;
    for await (const chunk of streamModel(OPENROUTER_MODEL, systemPrompt, messages)) {
      hadChunks = true;
      yield chunk;
    }
    if (hadChunks) return;
    console.warn(`[ai-client] primary ${OPENROUTER_MODEL} returned empty stream, trying fallback`);
  } catch (err: unknown) {
    console.warn(`[ai-client] primary ${OPENROUTER_MODEL} failed:`, (err as Error)?.message ?? err);
  }

  // Try fallback model
  try {
    for await (const chunk of streamModel(OPENROUTER_FALLBACK, systemPrompt, messages)) {
      yield chunk;
    }
    return;
  } catch (err: unknown) {
    console.error(`[ai-client] fallback ${OPENROUTER_FALLBACK} also failed:`, (err as Error)?.message ?? err);
    yield "I'm having trouble connecting right now. Please try again in a moment.";
  }
}

export async function companionGenerate(
  systemPrompt: string,
  messages: Msg[],
): Promise<string> {
  const client = getOpenRouter();
  const allMessages = [
    { role: "system" as const, content: systemPrompt },
    ...messages,
  ];

  const tryModel = async (model: string): Promise<string> => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (client.chat.completions.create as any)({
      ...STREAM_PARAMS,
      model,
      messages: allMessages,
      stream: false,
    });
    return (res.choices?.[0]?.message?.content ?? "").trim();
  };

  try {
    const text = await tryModel(OPENROUTER_MODEL);
    return text || "I'm here with you.";
  } catch (err: unknown) {
    console.warn(`[ai-client] generate primary failed:`, (err as Error)?.message ?? err);
    try {
      const text = await tryModel(OPENROUTER_FALLBACK);
      return text || "I'm here with you.";
    } catch {
      return "I'm here with you.";
    }
  }
}
