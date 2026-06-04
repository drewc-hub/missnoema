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

type RpCastMember = {
  id: string;
  role: string;
  joinedAt: string;
  companion: {
    id: string;
    slug: string;
    name: string;
    description: string;
    archetype?: string | null;
    profile: unknown;
    scenario?: string | null;
    greeting?: string | null;
    tags: string[];
    imageUrl?: string | null;
    focalX?: number | null;
    focalY?: number | null;
  };
};

type RpMemory = {
  campaignTitle: string;
  genre?: string | null;
  tone?: string | null;
  sessionSummary?: string | null;
  latestSceneSummary?: string | null;
  messageCount: number;
  lastActiveAt?: string | null;
};

type Props = {
  campaignId: string;
  title: string;
  cast?: RpCastMember[];
  memory?: RpMemory;
  storyPanel?: ReactNode;
  companionPicker?: ReactNode;
  initialMessages?: RpMessage[];
  initialScene?: RpScene | null;
};

const quickActions = [
  "Observe",
  "Speak",
  "Move",
  "Investigate",
  "Wait",
  "Begs",
  "Struggles",
  "Screams",
  "Moans",
  "Obeys",
];

export default function RpChatWorkspace({
  campaignId,
  title,
  cast = [],
  memory,
  storyPanel = null,
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

  const continuityNotes = useMemo(() => {
    const notes = [
      memory?.sessionSummary
        ? { label: "Session memory", value: memory.sessionSummary }
        : null,
      memory?.latestSceneSummary
        ? { label: "Latest scene", value: memory.latestSceneSummary }
        : null,
      scene?.imagePrompt
        ? { label: "Visual continuity", value: scene.imagePrompt }
        : null,
    ].filter(Boolean) as { label: string; value: string }[];

    return notes.slice(0, 3);
  }, [memory?.latestSceneSummary, memory?.sessionSummary, scene?.imagePrompt]);

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
    <main className="relative h-screen overflow-hidden bg-[#050816] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[url('/images/rp-dungeon-bg.png')] bg-cover bg-center opacity-[0.16]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[#050816]/70"
      />
      <div className="relative z-10 mx-auto grid h-full w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        {storyPanel ? (
          <aside className="min-h-0 lg:h-full">
            {storyPanel}
          </aside>
        ) : null}

        <div className="flex h-full min-h-0 min-w-0 flex-col">
          <header className="mb-3 max-h-[38vh] shrink-0 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.35em] text-blue-300">
              Noema Roleplay
            </p>
            <h1 className="mt-2 text-3xl font-bold">{title}</h1>
            <p className="mt-2 text-sm text-slate-300">
              Narrator-driven story mode with companion reactions and scene art.
            </p>
            <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
              <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Cast
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Active characters in this story.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                    {cast.length}
                  </span>
                </div>
                {cast.length > 0 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                    {cast.map((member) => (
                      <div
                        key={member.id}
                        className="flex min-w-52 gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2"
                      >
                        <div className="h-14 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                          {member.companion.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={member.companion.imageUrl}
                              alt={`${member.companion.name} portrait`}
                              className="h-full w-full object-cover"
                              style={{
                                objectPosition: `${member.companion.focalX ?? 50}% ${member.companion.focalY ?? 0}%`,
                              }}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-600">
                              {member.companion.name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold text-white">
                            {member.companion.name}
                          </div>
                          <div className="mt-0.5 text-[11px] capitalize text-blue-200">
                            {member.role}
                          </div>
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-slate-500">
                            {member.companion.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
                    Add one or more characters to make this a multi-character RP.
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Memory visibility
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      What the narrator is carrying forward.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                    {memory?.messageCount ?? messages.length} turns
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {continuityNotes.length > 0 ? (
                    continuityNotes.map((note) => (
                      <div
                        key={note.label}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-2"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">
                          {note.label}
                        </div>
                        <div className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">
                          {note.value}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
                      Story memory appears after scenes and summaries are created.
                    </div>
                  )}
                </div>
              </section>
            </div>
            {companionPicker}
          </header>

          <section className="mb-3 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-black/30">
          {scene?.imageUrl ? (
            <div className="flex max-h-72 min-h-44 items-center justify-center bg-black">
              <img
                src={scene.imageUrl}
                alt={scene.title}
                className="max-h-72 w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-44 items-center justify-center bg-gradient-to-br from-blue-950 via-slate-950 to-purple-950">
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

          <div className="border-t border-white/10 px-5 py-3">
            <h2 className="text-lg font-semibold">{sceneTitle}</h2>
          </div>
          </section>

          <section className="min-h-0 flex-1 space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4">
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

          <footer className="mt-3 shrink-0 rounded-3xl border border-white/10 bg-black/40 p-4">
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
            className="min-h-24 max-h-32 w-full resize-none overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-white outline-none placeholder:text-slate-500 focus:border-blue-400"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {quickActions.map((action) => {
                const dramatic = [
                  "Begs",
                  "Struggles",
                  "Screams",
                  "Moans",
                  "Obeys",
                ].includes(action);

                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() =>
                      setInput((prev) =>
                        prev ? `${prev} ${action.toLowerCase()}` : action
                      )
                    }
                    className={
                      dramatic
                        ? "rounded-full border border-pink-400/20 bg-pink-500/10 px-3 py-1 text-xs text-pink-100 hover:bg-pink-500/20"
                        : "rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/10"
                    }
                  >
                    {action}
                  </button>
                );
              })}
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
      </div>
    </main>
  );
}

function MessageBubble({ message }: { message: RpMessage }) {
  if (message.speakerType === "IMAGE" && message.imageUrl) {
    return (
      <article className="overflow-hidden rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
        <div className="flex max-h-[640px] items-center justify-center bg-black">
          <img
            src={message.imageUrl}
            alt={message.content || "Generated roleplay scene"}
            className="max-h-[640px] w-full object-contain"
          />
        </div>
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
