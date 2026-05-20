
"use client";

import React from "react";
import { Button } from "@/components/ui";

type Props = {
  input: string;
  setInput: (value: string) => void;
  sending: boolean;
  disabled: boolean;
  onSend: () => void;
  messageInputRef: React.RefObject<HTMLTextAreaElement | null>;
};

export function ChatComposer({
  input,
  setInput,
  sending,
  disabled,
  onSend,
  messageInputRef,
}: Props) {
  return (
    <div className="flex gap-2">
      <textarea
        ref={messageInputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={3}
        placeholder="Message..."
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        className="min-h-[88px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
      />
      <Button type="button" onClick={onSend} disabled={disabled}>
        {sending ? "Sending..." : "Send"}
      </Button>
    </div>
  );
}
