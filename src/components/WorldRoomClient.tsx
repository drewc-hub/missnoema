"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

type RoomMessage = {
  id: string;
  role: "USER" | "NARRATOR" | "SYSTEM";
  content: string;
  createdAt: string | Date;
  authorUser: {
    id: string;
    displayName: string | null;
    email: string | null;
  } | null;
};

function roleStyle(role: RoomMessage["role"]) {
  if (role === "SYSTEM") {
    return "border-zinc-700 bg-zinc-900/80 text-zinc-300";
  }
  if (role === "NARRATOR") {
    return "border-emerald-900/60 bg-emerald-950/40 text-emerald-100";
  }
  return "border-zinc-800 bg-black text-zinc-100";
}

export function WorldRoomClient({
  worldId,
  initialMessages,
  canPost,
}: {
  worldId: string;
  initialMessages: RoomMessage[];
  canPost: boolean;
}) {
  const [messages, setMessages] = useState<RoomMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/worlds/${worldId}/messages?limit=120`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.messages)) return;
      setMessages(data.messages);
    }, 3000);

    return () => clearInterval(id);
  }, [worldId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  async function sendMessage(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || !canPost) return;

    const content = input.trim();
    if (!content) return;

    setSending(true);
    setError(null);
    const res = await fetch(`/api/worlds/${worldId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setSending(false);
      setError(data?.error || "Failed to send message.");
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, data.message as RoomMessage]);
    setSending(false);
  }

  const empty = useMemo(
    () =>
      messages.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-6 text-sm text-zinc-500">
          No turns yet. Set the opening scene and begin roleplay.
        </div>
      ) : null,
    [messages.length],
  );

  return (
    <section className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div
        ref={listRef}
        className="max-h-[58vh] space-y-2 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3"
      >
        {empty}
        {messages.map((m) => {
          const author =
            m.authorUser?.displayName ||
            m.authorUser?.email?.split("@")[0] ||
            (m.role === "SYSTEM" ? "System" : "Player");
          return (
            <article key={m.id} className={`rounded-lg border p-3 ${roleStyle(m.role)}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold">{author}</span>
                <span className="text-zinc-500">{new Date(m.createdAt).toLocaleTimeString()}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6">{m.content}</p>
            </article>
          );
        })}
      </div>

      {canPost ? (
        <form onSubmit={sendMessage} className="space-y-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2500}
            rows={4}
            placeholder="Write your turn, actions, or dialogue..."
            className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
          />
          {error ? <p className="text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Posting..." : "Post turn"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-zinc-500">Join this world to post turns.</p>
      )}
    </section>
  );
}
