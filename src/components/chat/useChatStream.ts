
"use client";

import { useState } from "react";
import type { ChatMessage, ConversationMemory } from "@/components/chat/types";

type SendArgs = {
  companionId: string;
  message?: string;
  ooc?: string;
  onChunk?: (text: string) => void;
  onDone?: (event: Record<string, unknown>) => void;
};

export function useChatStream() {
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function streamRequest(
    args: SendArgs
  ): Promise<Record<string, unknown> | null> {
    const { companionId, message = "", ooc = "", onChunk, onDone } = args;

    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companionId, message, ooc }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Chat failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let donePayload: Record<string, unknown> | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === "chunk") {
            onChunk?.(String(event.text ?? ""));
          } else if (event.type === "done") {
            donePayload = event;
            onDone?.(event);
          } else if (event.type === "error") {
            throw new Error(String(event.error ?? "Chat failed."));
          }
        }
      }

      return donePayload;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
      return null;
    } finally {
      setSending(false);
    }
  }

  return {
    sending,
    error,
    setError,
    streamRequest,
  };
}
