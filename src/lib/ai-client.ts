// Streaming via raw openai client → OpenRouter
import { getOpenRouter, OPENROUTER_MODEL, OPENROUTER_FALLBACK } from "@/lib/together";

type Msg = {
  role: "user" | "assistant";
  content: string;
};

const STREAM_PARAMS = {
  max_tokens: 3000,
  temperature: 0.80,
} as const;

function logChat(event: string, data: Record<string, unknown>) {
  console.log(`[chat] ${event}`, JSON.stringify(data));
}

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

  logChat("stream_request", {
    model,
    systemPromptLen: systemPrompt.length,
    messageCount: messages.length,
    lastUserMsg: [...messages].reverse().find(m => m.role === "user")?.content?.slice(0, 120) ?? "(none)",
  });

  const t0 = Date.now();
  let chunkCount = 0;
  let totalChars = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stream = await (client.chat.completions.create as any)({
    ...STREAM_PARAMS,
    model,
    messages: allMessages,
    stream: true,
  });

  for await (const chunk of stream) {
    const text: string = chunk.choices?.[0]?.delta?.content ?? "";
    if (text) {
      chunkCount++;
      totalChars += text.length;
      yield text;
    }
  }

  logChat("stream_done", { model, chunkCount, totalChars, ms: Date.now() - t0 });
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
    logChat("stream_empty", { model: OPENROUTER_MODEL });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; error?: unknown };
    logChat("stream_error", {
      model: OPENROUTER_MODEL,
      status: e?.status,
      message: e?.message,
      error: JSON.stringify(e?.error ?? err),
    });
  }

  // Try fallback only if it differs from primary
  if (OPENROUTER_FALLBACK !== OPENROUTER_MODEL) {
    logChat("stream_fallback", { from: OPENROUTER_MODEL, to: OPENROUTER_FALLBACK });
    try {
      for await (const chunk of streamModel(OPENROUTER_FALLBACK, systemPrompt, messages)) {
        yield chunk;
      }
      return;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string; error?: unknown };
      logChat("stream_fallback_error", {
        model: OPENROUTER_FALLBACK,
        status: e?.status,
        message: e?.message,
        error: JSON.stringify(e?.error ?? err),
      });
    }
  }

  logChat("stream_gave_up", { primary: OPENROUTER_MODEL, fallback: OPENROUTER_FALLBACK });
  yield "I'm having trouble connecting right now. Please try again in a moment.";
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
    logChat("generate_request", { model, messageCount: messages.length });
    const t0 = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (client.chat.completions.create as any)({
      ...STREAM_PARAMS,
      model,
      messages: allMessages,
      stream: false,
    });
    const text = (res.choices?.[0]?.message?.content ?? "").trim();
    logChat("generate_done", { model, chars: text.length, ms: Date.now() - t0 });
    return text;
  };

  try {
    const text = await tryModel(OPENROUTER_MODEL);
    return text || "I'm here with you.";
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string; error?: unknown };
    logChat("generate_error", {
      model: OPENROUTER_MODEL,
      status: e?.status,
      message: e?.message,
      error: JSON.stringify(e?.error ?? err),
    });
    try {
      const text = await tryModel(OPENROUTER_FALLBACK);
      return text || "I'm here with you.";
    } catch {
      return "I'm here with you.";
    }
  }
}
