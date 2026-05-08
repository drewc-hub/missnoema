// file: src/components/CompanionChatWorkspace.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Badge,
} from "@/components/ui";
import { MediaGenPanel } from "@/components/MediaGenPanel";

type Companion = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  gender?: string | null;
  profile: any;
  contentRating: "SAFE" | "ADULT";
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  thumbnailUrl?: string | null;
};

const VOICE_PRESET_SETTINGS: Record<string, { pitch: number; rate: number; femaleHint: boolean }> = {
  "soft-young":          { pitch: 1.25, rate: 1.0,  femaleHint: true  },
  "warm-sultry":         { pitch: 0.9,  rate: 0.82, femaleHint: true  },
  "deep-breathy":        { pitch: 0.85, rate: 0.88, femaleHint: true  },
  "playful-energetic":   { pitch: 1.2,  rate: 1.12, femaleHint: true  },
  "mature-refined":      { pitch: 0.92, rate: 0.9,  femaleHint: false },
  "older-distinguished": { pitch: 0.78, rate: 0.85, femaleHint: false },
  "dark-mysterious":     { pitch: 0.82, rate: 0.88, femaleHint: false },
};

function speakMessage(text: string, voicePreset?: string | null, gender?: string | null) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const preset = voicePreset ? VOICE_PRESET_SETTINGS[voicePreset] : null;
  const isFemale = preset
    ? preset.femaleHint
    : (!gender || gender === "female" || gender === "non-binary");

  utter.pitch = preset?.pitch ?? (isFemale ? 1.1 : 0.9);
  utter.rate  = preset?.rate  ?? 1.0;

  function assignAndSpeak() {
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      isFemale
        ? /female|woman|girl|zira|samantha|victoria|fiona|karen|moira|veena|tessa/i.test(v.name)
        : /male|man|daniel|david|alex|fred|ralph|thomas|lekha|rishi/i.test(v.name),
    );
    if (preferred) utter.voice = preferred;
    window.speechSynthesis.speak(utter);
  }

  // getVoices() is async on first call — wait for voiceschanged if needed
  if (window.speechSynthesis.getVoices().length > 0) {
    assignAndSpeak();
  } else {
    window.speechSynthesis.addEventListener("voiceschanged", assignAndSpeak, { once: true });
  }
}

type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type ConversationMemory = {
  id: string;
  familiarity: number;
  trust: number;
  intimacy: number;
  summary?: string | null;
};

type MediaHistoryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  contentRating: "SAFE" | "ADULT";
  prompt: string;
  createdAt: string;
  url: string;
  isFavorite: boolean;
};

export function CompanionChatWorkspace({
  allowAdult,
  initialCompanionId,
}: {
  allowAdult: boolean;
  initialCompanionId?: string;
}) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [companionSearch, setCompanionSearch] = useState("");
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState<ConversationMemory | null>(null);
  const [companionMood, setCompanionMood] = useState<0 | 1 | 2 | 3>(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [lightboxItem, setLightboxItem] = useState<MediaHistoryItem | null>(null);

  const [mediaHistory, setMediaHistory] = useState<MediaHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const activeCompanion = useMemo(
    () => companions.find((c) => c.id === activeId) ?? null,
    [companions, activeId],
  );

  const filteredCompanions = useMemo(() => {
    const q = companionSearch.trim().toLowerCase();
    if (!q) return companions;
    return companions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [companions, companionSearch]);

  useEffect(() => {
    console.log("[CompanionChatWorkspace] activeId changed:", activeId);
  }, [activeId]);

  async function loadMediaHistory(companionId: string) {
    try {
      setLoadingHistory(true);

      const res = await fetch(
        `/api/media/history?companionId=${encodeURIComponent(companionId)}`,
      );
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load media history.");
      }

      const items = Array.isArray(data?.items) ? data.items : [];
      setMediaHistory(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load media history.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  async function toggleFavorite(item: MediaHistoryItem) {
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          isFavorite: !item.isFavorite,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update favorite.");
      }

      const toggled = !item.isFavorite;
      setMediaHistory((prev) => {
        const next = prev.map((x) =>
          x.id === item.id ? { ...x, isFavorite: toggled } : x,
        );
        return next.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      });
      setLightboxItem((prev) =>
        prev?.id === item.id ? { ...prev, isFavorite: toggled } : prev,
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update favorite.",
      );
    }
  }

  async function deleteMedia(item: MediaHistoryItem) {
    const confirmed = window.confirm("Delete this media item?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete media.");
      }

      setMediaHistory((prev) => prev.filter((x) => x.id !== item.id));

      if (lightboxItem?.id === item.id) {
        setLightboxItem(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete media.");
    }
  }

  useEffect(() => {
    async function loadCompanions() {
      try {
        setLoadingList(true);
        setError(null);

        const endpoint = initialCompanionId
          ? `/api/me/companions?include=${encodeURIComponent(initialCompanionId)}`
          : "/api/me/companions";
        const res = await fetch(endpoint);
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load companions.");
        }

        const items = Array.isArray(data?.items) ? data.items : [];

        if (process.env.NODE_ENV !== "production") {
          console.log(
            "[CompanionChatWorkspace] companions loaded:",
            items.map((c: Companion) => ({ id: c.id, name: c.name }))
          );
        }

        setCompanions(items);

        setActiveId((current) => {
          if (!current) {
            const preferred = initialCompanionId && items.find((c: Companion) => c.id === initialCompanionId);
            const target = preferred ? preferred.id : (items[0]?.id ?? "");
            console.log("[CompanionChatWorkspace] setting initial activeId:", target);
            return target;
          }
          return current;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load companions.",
        );
      } finally {
        setLoadingList(false);
      }
    }

    loadCompanions();
  }, []);

  useEffect(() => {
    async function loadConversation() {
      if (!activeId) {
        setMessages([]);
        setMemory(null);
        setCompanionMood(0);
        setMediaHistory([]);
        setLightboxItem(null);
        return;
      }

      try {
        setLoadingConversation(true);
        setError(null);

        const [conversationRes, suggestionRes] = await Promise.all([
          fetch(
            `/api/chat/session?companionId=${encodeURIComponent(activeId)}`,
          ),
          fetch(
            `/api/chat/suggestions?companionId=${encodeURIComponent(activeId)}`,
          ),
        ]);

        const conversationData = await conversationRes.json().catch(() => null);
        const suggestionData = await suggestionRes.json().catch(() => null);

        if (!conversationRes.ok) {
          throw new Error(
            conversationData?.error || "Failed to load conversation.",
          );
        }

        setMessages(conversationData?.conversation?.messages ?? []);
        setMemory({
          id: conversationData.conversation.id,
          familiarity: conversationData.conversation.familiarity,
          trust: conversationData.conversation.trust,
          intimacy: conversationData.conversation.intimacy,
          summary: conversationData.conversation.summary ?? null,
        });

        if (suggestionRes.ok) {
          setSuggestions(
            Array.isArray(suggestionData?.suggestions)
              ? suggestionData.suggestions
              : [],
          );
        } else {
          setSuggestions([]);
        }

        await loadMediaHistory(activeId);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load conversation.",
        );
      } finally {
        setLoadingConversation(false);
      }
    }

    loadConversation();
  }, [activeId]);

  async function sendMessage(customMessage?: string) {
    if (!activeCompanion || sending) return;

    const userText = (customMessage ?? input).trim();
    if (!userText) return;

    // Add user message + empty assistant placeholder immediately
    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companionId: activeCompanion.id, message: userText }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Chat failed.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "chunk") {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, content: last.content + event.text };
                }
                return next;
              });
            } else if (event.type === "done") {
              if (typeof event.moodTier === "number" && event.moodTier >= 0 && event.moodTier <= 3) {
                setCompanionMood(event.moodTier as 0 | 1 | 2 | 3);
              }
              if (event.memory) {
                setMemory({
                  id: event.memory.id ?? memory?.id ?? "",
                  familiarity: event.memory.familiarity,
                  trust: event.memory.trust,
                  intimacy: event.memory.intimacy,
                  summary: event.memory.summary ?? null,
                });
              }
            } else if (event.type === "error") {
              throw new Error(event.error || "Chat failed.");
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      // Remove the empty assistant placeholder on failure
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
      setError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function refreshSuggestions() {
    if (!activeCompanion || loadingSuggestion) return;
    setLoadingSuggestion(true);
    try {
      const res = await fetch("/api/chat/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companionId: activeCompanion.id,
          messages: messages.slice(-8),
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && Array.isArray(data?.suggestions)) {
        setSuggestions(data.suggestions);
      }
    } catch {
      // silently fail — suggestions are non-critical
    } finally {
      setLoadingSuggestion(false);
    }
  }

  async function rerunReply(messageId?: string) {
    if (sending || !memory) return;

    try {
      setSending(true);
      setError(null);

      let res: Response;

      if (messageId) {
        // Rerun from a specific message (has a DB id — loaded from session)
        const msg = messages.find((m) => m.id === messageId);
        if (!msg) return;
        res = await fetch("/api/chat/rewrite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messageId, content: msg.content, rerun: true }),
        });
      } else {
        // Rerun last reply using conversationId (works for optimistic messages too)
        res = await fetch("/api/chat/rerun", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: memory.id }),
        });
      }

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to rerun reply.");
      setMessages(data.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rerun reply.");
    } finally {
      setSending(false);
    }
  }

  function startEditMessage(index: number) {
    setEditingIndex(index);
    setEditingText(messages[index].content);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText("");
  }

  async function saveEdit() {
    if (editingIndex === null) return;

    const message = messages[editingIndex];
    if (!message?.id) {
      cancelEdit();
      return;
    }

    try {
      setSending(true);
      setError(null);

      const res = await fetch("/api/chat/rewrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageId: message.id,
          content: editingText,
          rerun: message.role === "user",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save edit.");
      }

      setMessages(data.messages ?? []);
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save edit.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader
              title="Companions"
              subtitle={loadingList ? "Loading…" : `${filteredCompanions.length} shown`}
            />
            <CardBody>
              <div className="space-y-2">
                <Input
                  placeholder="Search companions…"
                  value={companionSearch}
                  onChange={(e) => setCompanionSearch(e.target.value)}
                />

                {loadingList ? (
                  <div className="text-sm text-zinc-400">
                    Loading companions...
                  </div>
                ) : null}

                {!loadingList && filteredCompanions.length === 0 ? (
                  <div className="text-sm text-zinc-400">
                    {companionSearch
                      ? "No matches."
                      : "Browse the library and click a companion to start chatting."}
                  </div>
                ) : null}

                {filteredCompanions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveId(c.id)}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      c.id === activeId
                        ? "border-zinc-300 bg-zinc-800"
                        : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-zinc-100">{c.name}</div>
                      <Badge
                        tone={c.contentRating === "ADULT" ? "adult" : "safe"}
                      >
                        {c.contentRating}
                      </Badge>
                    </div>

                    <div className="mt-1 line-clamp-2 text-xs text-zinc-400">
                      {c.description}
                    </div>
                  </button>
                ))}
              </div>
            </CardBody>
          </Card>
          {activeCompanion ? (
            <Card>
              <CardHeader
                title="Media history"
                subtitle={loadingHistory ? "Loading…" : `${mediaHistory.length} item${mediaHistory.length === 1 ? "" : "s"}`}
              />
              <CardBody>
                {loadingHistory ? (
                  <div className="text-sm text-zinc-400">Loading history...</div>
                ) : mediaHistory.length === 0 ? (
                  <div className="text-sm text-zinc-500">No generated media yet.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {mediaHistory.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLightboxItem(item)}
                        className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition hover:border-zinc-600"
                      >
                        <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                          {item.type === "VIDEO" ? (
                            <video className="h-full w-full object-cover" muted>
                              <source src={item.url} />
                            </video>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.url}
                              alt="Media history item"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="p-1.5 text-center text-[10px] text-zinc-500">
                          {item.type} {item.isFavorite ? "★" : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ) : null}
        </aside>

        <section className="space-y-4 lg:col-span-6">
          {activeCompanion ? (
            <Card>
              <CardHeader
                title={activeCompanion.name}
                subtitle="Current companion"
                right={
                  <Badge
                    tone={
                      activeCompanion.contentRating === "ADULT"
                        ? "adult"
                        : "safe"
                    }
                  >
                    {activeCompanion.contentRating}
                  </Badge>
                }
              />
              <CardBody>
                <div className="flex gap-4">
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
                    {activeCompanion.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={activeCompanion.thumbnailUrl}
                        alt={`${activeCompanion.name} thumbnail`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-500">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1 space-y-2 text-sm text-zinc-300">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-zinc-100">
                        {activeCompanion.name}
                      </div>
                      {(() => {
                        const moods = [
                          { emoji: "😐", label: "Neutral", color: "text-zinc-400" },
                          { emoji: "😊", label: "Happy", color: "text-emerald-400" },
                          { emoji: "😏", label: "Teasing", color: "text-purple-400" },
                          { emoji: "🥰", label: "Blushing", color: "text-rose-400" },
                        ] as const;
                        const mood = moods[companionMood];
                        return (
                          <span className={`text-xs ${mood.color}`} title={`Mood: ${mood.label}`}>
                            {mood.emoji} {mood.label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-zinc-400">
                      {activeCompanion.description}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activeCompanion.tags?.slice(0, 6).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Chat"
              subtitle="Edit messages, rerun or re-speak any reply."
            />

            <CardBody>
              <div className="space-y-4">
                {memory ? (
                  <>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                      {[
                        { label: "Familiarity", value: memory.familiarity, color: "bg-blue-500" },
                        { label: "Trust", value: memory.trust, color: "bg-emerald-500" },
                        { label: "Intimacy", value: memory.intimacy, color: "bg-rose-500" },
                      ].map(({ label, value, color }) => (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-zinc-300">{label}</span>
                            <span className="text-zinc-500">{value}/100</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-zinc-800">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${color}`}
                              style={{ width: `${Math.min(value, 100)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {memory.summary ? (
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                        <div className="mb-1 text-zinc-200">
                          Conversation summary
                        </div>
                        <div>{memory.summary}</div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                <div ref={messagesContainerRef} className="max-h-[430px] space-y-3 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                  {loadingConversation ? (
                    <div className="text-sm text-zinc-500">
                      Loading conversation...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-sm text-zinc-500">
                      Start the conversation.
                    </div>
                  ) : (
                    messages.map((m, i) => (
                      <div
                        key={m.id ?? i}
                        className={`rounded-xl p-3 text-sm ${
                          m.role === "user"
                            ? "ml-10 bg-zinc-800 text-zinc-100"
                            : "mr-10 bg-zinc-900 text-zinc-300"
                        }`}
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                            {m.role === "assistant"
                              ? (activeCompanion?.name ?? "Companion")
                              : "You"}
                          </div>
                          {m.content ? (
                            <div className="flex items-center gap-2">
                              {m.role === "assistant" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => speakMessage(m.content, activeCompanion?.profile?.voice, activeCompanion?.gender)}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-200 transition"
                                    title="Read aloud"
                                  >
                                    🔊
                                  </button>
                                  <button
                                    type="button"
                                    disabled={sending}
                                    onClick={() => rerunReply(m.id)}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-200 transition disabled:opacity-40"
                                    title="Regenerate reply"
                                  >
                                    ↺
                                  </button>
                                </>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => startEditMessage(i)}
                                className="text-[11px] text-zinc-400 hover:text-zinc-200"
                              >
                                Edit
                              </button>
                            </div>
                          ) : null}
                        </div>

                        {editingIndex === i ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              rows={4}
                              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100"
                            />
                            <div className="flex gap-2">
                              <Button type="button" onClick={saveEdit}>
                                Save
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                onClick={cancelEdit}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : m.content ? (
                          <div>{m.content}</div>
                        ) : (
                          <div className="flex gap-1 py-0.5">
                            <span className="animate-bounce text-zinc-500 text-xs" style={{ animationDelay: "0ms" }}>●</span>
                            <span className="animate-bounce text-zinc-500 text-xs" style={{ animationDelay: "150ms" }}>●</span>
                            <span className="animate-bounce text-zinc-500 text-xs" style={{ animationDelay: "300ms" }}>●</span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-zinc-400">Suggested responses</div>
                    <button
                      type="button"
                      onClick={refreshSuggestions}
                      disabled={loadingSuggestion || !activeCompanion || messages.length === 0}
                      className="rounded-lg border border-blue-900/60 bg-blue-950/40 px-2.5 py-1 text-xs text-blue-300 hover:bg-blue-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {loadingSuggestion ? "Thinking…" : "✦ Suggest a reply"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setInput(s)}
                        className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setInput(e.target.value)
                    }
                    placeholder={
                      activeCompanion
                        ? `Message ${activeCompanion.name}...`
                        : "Message..."
                    }
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || sending || !activeCompanion}
                  >
                    {sending ? "Sending..." : "Send"}
                  </Button>
                </div>

                {error ? (
                  <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-200">
                    {error}
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </section>

        <aside className="space-y-4 lg:col-span-3">
          {activeCompanion ? (
            <MediaGenPanel
              allowAdult={allowAdult}
              loggedIn={true}
              companionId={activeCompanion.id}
              contentRating={activeCompanion.contentRating}
              defaultTag={activeCompanion.tags?.[0] ?? ""}
              onGenerated={() => loadMediaHistory(activeCompanion.id)}
              onHistoryRefresh={() => loadMediaHistory(activeCompanion.id)}
            />
          ) : null}
        </aside>
      </div>

      {lightboxItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="relative max-h-[90vh] max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxItem(null)}
              className="absolute -top-10 right-0 text-sm text-zinc-400 hover:text-zinc-100"
            >
              Close ✕
            </button>

            {lightboxItem.type === "VIDEO" ? (
              <video
                controls
                autoPlay
                className="max-h-[80vh] w-full rounded-2xl border border-zinc-700"
              >
                <source src={lightboxItem.url} />
              </video>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightboxItem.url}
                alt="Media full size"
                className="max-h-[80vh] w-full rounded-2xl border border-zinc-700 object-contain"
              />
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Badge tone={lightboxItem.contentRating === "ADULT" ? "adult" : "safe"}>
                  {lightboxItem.contentRating}
                </Badge>
                <span className="text-xs text-zinc-400">{lightboxItem.type}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={lightboxItem.isFavorite ? "primary" : "secondary"}
                  className="px-3 py-1.5 text-xs"
                  onClick={() => toggleFavorite(lightboxItem)}
                >
                  {lightboxItem.isFavorite ? "★ Favorited" : "☆ Favorite"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-1.5 text-xs"
                  onClick={() => deleteMedia(lightboxItem)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
