"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, ChevronDown, UserPlus } from "lucide-react";

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
  const [storiesOpen, setStoriesOpen] = useState(false);
  const [charactersOpen, setCharactersOpen] = useState(false);

  const messagesRef = useRef<HTMLElement | null>(null);

  const sceneTitle = useMemo(() => {
    if (!scene) return "Roleplay Scene";
    return [scene.title, scene.location, scene.mood].filter(Boolean).join(" · ");
  }, [scene]);

  const recentStoryEvents = useMemo(
    () =>
      messages
        .filter(
          (message) =>
            message.content.trim() &&
            ["NARRATOR", "SYSTEM"].includes(message.speakerType),
        )
        .slice(-4)
        .reverse(),
    [messages],
  );

  const questTracker = useMemo(() => {
    const latestUserAction = messages
      .filter((message) => message.speakerType === "USER" && message.content.trim())
      .slice(-1)[0];

    return {
      objective:
        memory?.latestSceneSummary ||
        memory?.sessionSummary ||
        "Advance the current scene.",
      latestAction: latestUserAction?.content ?? null,
      status: pending ? "Updating" : "Active",
    };
  }, [memory?.latestSceneSummary, memory?.sessionSummary, messages, pending]);

  useEffect(() => {
    const panel = messagesRef.current;
    if (!panel) return;

    panel.scrollTo({
      top: panel.scrollHeight,
      behavior: messages.length > initialMessages.length ? "smooth" : "auto",
    });
  }, [messages, pending, initialMessages.length]);

  function releaseWheelToPage(event: React.WheelEvent<HTMLElement>) {
    const panel = event.currentTarget;
    const atTop = panel.scrollTop <= 0;
    const atBottom =
      Math.ceil(panel.scrollTop + panel.clientHeight) >= panel.scrollHeight;

    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
      event.preventDefault();
      window.scrollBy({ top: event.deltaY, behavior: "auto" });
    }
  }

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
    <main className="relative min-h-screen overflow-x-hidden bg-[#050816] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[url('/images/rp-dungeon-bg.png')] bg-cover bg-center opacity-[0.26]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[#050816]/70"
      />
      <div className="relative z-10 mx-auto min-h-screen w-full max-w-7xl px-4 py-6">
        <div className="flex min-h-screen min-w-0 flex-col">
          <header className="mb-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl">
            <div className="grid gap-3 xl:grid-cols-3">
              <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Character Portraits
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
                      Recent Story Events
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Important moments from the current story.
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                    {recentStoryEvents.length}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {recentStoryEvents.length > 0 ? (
                    recentStoryEvents.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-xl border border-white/10 bg-white/[0.04] p-2"
                      >
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">
                          {event.speakerType === "NARRATOR" ? "Story event" : "Campaign event"}
                        </div>
                        <div className="mt-1 line-clamp-3 text-xs leading-5 text-slate-400">
                          {event.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-slate-500">
                      Recent story events appear as the narrator advances the scene.
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-white/10 bg-black/25 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Quest Tracker
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Current objective and latest action.
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-200">
                    {questTracker.status}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">
                      Active objective
                    </div>
                    <div className="mt-1 line-clamp-4 text-xs leading-5 text-slate-400">
                      {questTracker.objective}
                    </div>
                  </div>
                  {questTracker.latestAction ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Latest action
                      </div>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {questTracker.latestAction}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>
            </div>
          </header>

          <section className="mb-4 rounded-3xl border border-white/10 bg-black/30">
          {scene?.imageUrl ? (
            <div className="flex max-h-[30rem] min-h-72 items-center justify-center overflow-hidden rounded-t-3xl bg-black">
              <img
                src={scene.imageUrl}
                alt={scene.title}
                className="max-h-[30rem] w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex h-72 items-center justify-center overflow-hidden rounded-t-3xl bg-gradient-to-br from-blue-950 via-slate-950 to-purple-950">
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

          <div className="relative z-30 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-4">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.3em] text-blue-300">
                Current Scene
              </p>
              <h2 className="truncate text-lg font-semibold">{sceneTitle}</h2>
              <p className="mt-1 truncate text-xs text-slate-500">{title}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {storyPanel ? (
                <div
                  className="relative"
                  onMouseEnter={() => setStoriesOpen(true)}
                  onMouseLeave={() => setStoriesOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setStoriesOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 text-sm font-semibold text-slate-200 transition hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white"
                    aria-expanded={storiesOpen}
                  >
                    <BookOpen className="h-4 w-4 text-blue-300" />
                    Campaigns
                    <ChevronDown className={`h-3.5 w-3.5 transition ${storiesOpen ? "rotate-180" : ""}`} />
                  </button>
                  {storiesOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-2 h-[min(34rem,calc(100dvh-9rem))] w-[min(22rem,calc(100vw-2rem))]">
                      {storyPanel}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {companionPicker ? (
                <div
                  className="relative"
                  onMouseEnter={() => setCharactersOpen(true)}
                  onMouseLeave={() => setCharactersOpen(false)}
                >
                  <button
                    type="button"
                    onClick={() => setCharactersOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                    aria-expanded={charactersOpen}
                  >
                    <UserPlus className="h-4 w-4" />
                    Add characters
                    <ChevronDown className={`h-3.5 w-3.5 transition ${charactersOpen ? "rotate-180" : ""}`} />
                  </button>
                  {charactersOpen ? (
                    <div className="absolute right-0 top-full z-50 mt-2 max-h-[min(38rem,calc(100dvh-9rem))] w-[min(44rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-white/10 bg-[#080d1b]/95 p-1 shadow-2xl backdrop-blur-xl">
                      {companionPicker}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          </section>

          <section
            ref={messagesRef}
            onWheel={releaseWheelToPage}
            className="h-[36rem] space-y-4 overflow-y-auto rounded-3xl border border-white/10 bg-white/[0.03] p-4"
          >
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
