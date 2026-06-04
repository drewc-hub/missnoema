"use client";

import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

type SpeakerType = "USER" | "COMPANION" | "NARRATOR" | "SYSTEM" | "IMAGE";

type RpMessage = {
  id: string;
  speakerType: SpeakerType;
  content: string;
  imageUrl?: string | null;
  createdAt?: string;
};

type RpScene = {
  id: string;
  title: string;
  location?: string | null;
  mood?: string | null;
  imagePrompt?: string | null;
  imageUrl?: string | null;
};

type Props = {
  campaignId: string;
  title: string;
  companionPicker?: ReactNode;
  initialMessages?: RpMessage[];
  initialScene?: RpScene | null;
};

export default function RpChatWorkspace({
  campaignId,
  title,
  companionPicker = null,
  initialMessages = [],
  initialScene = null,
}: Props) {
  const [messages, setMessages] = useState<RpMessage[]>(initialMessages);
  const [scene, setScene] = useState<RpScene | null>(initialScene);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const sceneTitle = useMemo(() => {
    if (!scene) return "Roleplay Scene";
    return [scene.title, scene.location, scene.mood].filter(Boolean).join(" · ");
  }, [scene]);

  async function sendAction() {
    const content = input.trim();
    if (!content || pending) return;

    const tempUserMessage: RpMessage = {
      id: `temp-${Date.now()}`,
      speakerType: "USER",
      content,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMessage]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch(`/api/rp/${campaignId}/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send action");
      }

      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMessage.id);
        return [
          ...withoutTemp,
          data.userMessage,
          ...(data.messages ?? []),
        ];
      });

      if (data.scene) {
        setScene(data.scene);
      }

      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 50);
    } catch (err) {
      console.error(err);

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          speakerType: "SYSTEM",
          content: "Something went wrong processing this roleplay action.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6">
        <header className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-blue-300">
            Noema Roleplay
          </p>
          <h1 className="mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-slate-300">
            Narrator-driven story mode with companion reactions and scene art.
          </p>
          {companionPicker}
        </header>

        <section className="mb-4 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
          {scene?.imageUrl ? (
            <img
              src={scene.imageUrl}
              alt={scene.title}
              className="h-72 w-full object-cover"
            />
          ) : (
            <div className="flex h-72 items-center justify-center bg-gradient-to-br from-blue-950 via-slate-950 to-purple-950">
              <div className="max-w-xl px-6 text-center">
                <p className="text-xs uppercase tracking-[0.35em] text-blue-300">
                  Current Scene
                </p>
                <h2 className="mt-3 text-2xl font-semibold">{sceneTitle}</h2>
                {scene?.imagePrompt && (
                  <p className="mt-3 text-sm text-slate-300">
                    {scene.imagePrompt}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="border-t border-white/10 px-5 py-4">
            <h2 className="text-lg font-semibold">{sceneTitle}</h2>
          </div>
        </section>

        <section className="flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          {messages.length === 0 && (
            <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-slate-300">
              Begin the story with an action like: “I enter the ruined chapel.”
            </div>
          )}

          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {pending && (
            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-4 text-sm text-blue-200">
              The narrator is shaping the next scene...
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        <footer className="mt-4 rounded-3xl border border-white/10 bg-black/40 p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendAction();
              }
            }}
            placeholder="Describe your action..."
            className="min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {["Observe", "Speak", "Move", "Investigate", "Wait"].map(
                (action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() =>
                      setInput((prev) =>
                        prev ? `${prev} ${action.toLowerCase()}` : action
                      )
                    }
                    className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/10"
                  >
                    {action}
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={sendAction}
              disabled={pending || !input.trim()}
              className="rounded-2xl bg-blue-500 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Writing..." : "Send Action"}
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

function MessageBubble({ message }: { message: RpMessage }) {
  if (message.speakerType === "IMAGE" && message.imageUrl) {
    return (
      <article className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
        <img
          src={message.imageUrl}
          alt={message.content || "Generated roleplay scene"}
          className="max-h-[520px] w-full object-cover"
        />
        <div className="border-t border-white/10 px-5 py-3">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-300">
            Scene Image
          </p>
          {message.content ? (
            <p className="mt-1 text-sm text-emerald-50">{message.content}</p>
          ) : null}
        </div>
      </article>
    );
  }

  if (message.speakerType === "NARRATOR") {
    return (
      <article className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-5">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-purple-300">
          Narrator
        </p>
        <p className="whitespace-pre-wrap leading-7 text-purple-50">
          {message.content}
        </p>
      </article>
    );
  }

  if (message.speakerType === "COMPANION") {
    return (
      <article className="ml-auto max-w-3xl rounded-2xl border border-pink-400/20 bg-pink-500/10 p-5">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-pink-300">
          Companion
        </p>
        <p className="whitespace-pre-wrap leading-7 text-pink-50">
          {message.content}
        </p>
      </article>
    );
  }

  if (message.speakerType === "USER") {
    return (
      <article className="max-w-3xl rounded-2xl border border-blue-400/20 bg-blue-500/10 p-5">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-blue-300">
          You
        </p>
        <p className="whitespace-pre-wrap leading-7 text-blue-50">
          {message.content}
        </p>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-300">
      {message.content}
    </article>
  );
}
