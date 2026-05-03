"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  profile: any;
  contentRating: "SAFE" | "ADULT";
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  thumbnailUrl?: string | null;
};

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
  createdAt: string;
  url: string;
  isFavorite: boolean;
};

function isImageRequest(message: string) {
  const text = message.toLowerCase();

  return (
    text.includes("show me") ||
    text.includes("what do you look like") ||
    text.includes("picture") ||
    text.includes("photo") ||
    text.includes("image") ||
    text.includes("wearing") ||
    text.includes("in a")
  );
}
export function CompanionChatWorkspace({
  allowAdult,
  initialCompanionId,
}: {
  allowAdult: boolean;
  initialCompanionId?: string;
}) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState<ConversationMemory | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [mediaHistory, setMediaHistory] = useState<MediaHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const activeCompanion = useMemo(
    () => companions.find((c) => c.id === activeId) ?? null,
    [companions, activeId],
  );

  const [showDeleteCompanionModal, setShowDeleteCompanionModal] =
    useState(false);

  const [showNewChapterModal, setShowNewChapterModal] = useState(false);

  async function handleReset(keepMemories: boolean) {
    setMessages([]);

    if (!keepMemories) {
      setMemory(null);
      setSuggestions([]);
    }
  }

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

      if (items.length > 0 && !previewUrl) {
        setPreviewUrl(items[0].url);
      }
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

      setMediaHistory((prev) => {
        const next = prev.map((x) =>
          x.id === item.id ? { ...x, isFavorite: !x.isFavorite } : x,
        );
        return next.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
      });
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

      if (previewUrl === item.url) {
        const remaining = mediaHistory.filter((x) => x.id !== item.id);
        setPreviewUrl(remaining[0]?.url ?? null);
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

        const res = await fetch("/api/me/companions");
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load companions.");
        }

        const items = Array.isArray(data?.items) ? data.items : [];
        setCompanions(items);

        setActiveId((prev) => {
          if (prev && items.some((c: Companion) => c.id === prev)) {
            return prev;
          }

          if (
            initialCompanionId &&
            items.some((c: Companion) => c.id === initialCompanionId)
          ) {
            return initialCompanionId;
          }

          return items[0]?.id ?? "";
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
        setMediaHistory([]);
        setPreviewUrl(null);
        return;
      }

      try {
        setLoadingConversation(true);
        setError(null);
        setPreviewUrl(null);

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

    const optimisticUserMessage: ChatMessage = {
      role: "user",
      content: userText,
    };

    setMessages((prev) => [...prev, optimisticUserMessage]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      if (isImageRequest(userText) && activeCompanion) {
        try {
          const enhancedPrompt = `${userText}, ${activeCompanion.name}, ${activeCompanion.description}, cinematic lighting, high quality`;

          await fetch("/api/media/generate", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              companionId: activeCompanion.id,
              prompt: enhancedPrompt,
              type: "image",
              contentRating: activeCompanion.contentRating,
            }),
          });

          await loadMediaHistory(activeCompanion.id);
        } catch (err) {
          console.error("Auto image generation failed", err);
        }
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companionId: activeCompanion.id,
          message: userText,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Chat failed.");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data?.reply || "I'm here with you.",
        },
      ]);

      if (data?.memory) {
        setMemory({
          id: data.memory.id ?? memory?.id ?? "",
          familiarity: data.memory.familiarity,
          trust: data.memory.trust,
          intimacy: data.memory.intimacy,
          summary: data.memory.summary ?? null,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setSending(false);
    }
  }

  async function rerunLastAssistantReply(
    mode: "rerun" | "variation" = "rerun",
  ) {
    if (sending) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser?.id) return;

    try {
      setSending(true);
      const res = await fetch("/api/chat/rewrite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageId: lastUser.id,
          content: lastUser.content,
          rerun: true,
          mode,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to rerun reply.");
      }

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

  function handleNewChapterClick() {
    setShowNewChapterModal(true);
  }

  function closeNewChapterModal() {
    setShowNewChapterModal(false);
  }

  function handleNewChapterReset(totalReset: boolean) {
    setMessages([]);

    if (totalReset) {
      setMemory(null);
      setSuggestions([]);
    }

    setShowNewChapterModal(false);
  }

  function cancelEdit() {
    setEditingIndex(null);
    setEditingText("");
  }

  async function handleDeleteCompanion() {
    if (!activeCompanion) return;

    try {
      const res = await fetch(`/api/companions/${activeCompanion.id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete companion.");
      }

      // remove from local list
      setCompanions((prev) => prev.filter((c) => c.id !== activeCompanion.id));

      // reset UI safely
      setActiveId("");
      setMessages([]);
      setMemory(null);
      setSuggestions([]);

      setShowDeleteCompanionModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

     async function deleteAsset(assetId: string) {
  const res = await fetch(`/api/media/${assetId}/delete`, {
    method: "POST",
  });

  if (!res.ok) {
    alert("Failed to delete media");
    return;
  }

  window.location.reload();
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
              title="Your companions"
              subtitle="Choose who you want to chat with."
            />
            <CardBody>
              <div className="space-y-2">
                {loadingList ? (
                  <div className="text-sm text-zinc-400">
                    Loading companions...
                  </div>
                ) : null}

                {!loadingList && companions.length === 0 ? (
                  <div className="text-sm text-zinc-400">
                    No companions yet.
                  </div>
                ) : null}

                {companions.map((c) => (
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
                      <div className="font-small text-zinc-100">{c.name}</div>
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
                {activeCompanion ? (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Companion actions
                      </div>
                          <button onClick={() => deleteAsset(asset.id)}>
                    Delete
                    </button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setShowDeleteCompanionModal(true)}
                      disabled={sending}
                      className="w-full"
                    >
                      Delete {activeCompanion.name}
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>
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
                    <div className="font-semibold text-zinc-100">
                      {activeCompanion.name}
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
              title={
                <div className="text-center">
                  <div className="text-xl font-semibold text-zinc-100">
                    Chat
                  </div>

                  <div className="mt-3 flex justify-center gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleNewChapterClick}
                      disabled={messages.length === 0 || sending}
                    >
                      New Chapter
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => rerunLastAssistantReply("rerun")}
                      disabled={
                        !messages.some((m) => m.role === "assistant") || sending
                      }
                    >
                      Rerun
                    </Button>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => rerunLastAssistantReply("variation")}
                      disabled={
                        !messages.some((m) => m.role === "assistant") || sending
                      }
                    >
                      Variation
                    </Button>
                  </div>

                  <div className="mt-3 text-sm text-zinc-400">
                    Edit messages, rerun the latest reply, and use tailored
                    suggestions.
                  </div>
                </div>
              }
            />

            <CardBody>
              {showNewChapterModal ? (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-in fade-in duration-200"
                  onClick={() => setShowNewChapterModal(false)}
                >
                  <div
                    className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-zinc-100">
                        Start a New Chapter
                      </h2>
                      <p className="text-sm text-zinc-400">
                        Choose how you want to continue with this companion.
                      </p>
                    </div>

                    <div className="mt-5 space-y-3">
                      <button
                        type="button"
                        onClick={() => handleNewChapterReset(false)}
                        className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-left transition hover:bg-zinc-800"
                      >
                        <div className="font-medium text-zinc-100">
                          Keep Memories
                        </div>
                        <div className="mt-1 text-sm text-zinc-400">
                          Clear the visible chat and keep relationship context.
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleNewChapterReset(true)}
                        className="w-full rounded-xl border border-red-800/60 bg-red-950/20 px-4 py-3 text-left transition hover:bg-red-950/30"
                      >
                        <div className="font-medium text-red-200">
                          Total Reset
                        </div>
                        <div className="mt-1 text-sm text-red-400">
                          Clear the chat, memory, and suggestions for a fresh
                          start.
                        </div>
                      </button>
                    </div>

                    <div className="mt-5 flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowNewChapterModal(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              {showDeleteCompanionModal ? (
                <div
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 animate-in fade-in duration-200"
                  onClick={() => setShowDeleteCompanionModal(false)}
                >
                  <div
                    className="w-full max-w-md rounded-2xl border border-red-900/40 bg-zinc-950 p-6 shadow-2xl animate-in zoom-in-95 fade-in duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-red-200">
                        Delete {activeCompanion?.name}?
                      </h2>

                      <p className="text-sm text-zinc-400">
                        This will permanently remove {activeCompanion?.name} and
                        all related chat history and media. This action cannot
                        be undone.
                      </p>
                    </div>

                    <div className="mt-5 flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowDeleteCompanionModal(false)}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        className="bg-red-600 hover:bg-red-700 text-white"
                        onClick={handleDeleteCompanion}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="space-y-4">
                {memory ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                        <div className="text-zinc-200">Familiarity</div>
                        <div className="mt-1 text-lg font-semibold">
                          {memory.familiarity}
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                        <div className="text-zinc-200">Trust</div>
                        <div className="mt-1 text-lg font-semibold">
                          {memory.trust}
                        </div>
                      </div>
                      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                        <div className="text-zinc-200">Intimacy</div>
                        <div className="mt-1 text-lg font-semibold">
                          {memory.intimacy}
                        </div>
                      </div>
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

                <div className="max-h-[430px] space-y-3 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3">
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
                            {m.role}
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditMessage(i)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-200"
                          >
                            Edit
                          </button>
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
                        ) : (
                          <div>{m.content}</div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-2">
                  <div className="text-xs text-zinc-400">
                    Suggested responses
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
            <>
              <MediaGenPanel
                allowAdult={allowAdult}
                loggedIn={true}
                companionId={activeCompanion.id}
                contentRating={activeCompanion.contentRating}
                defaultTag={activeCompanion.tags?.[0] ?? ""}
                onGenerated={setPreviewUrl}
                onHistoryRefresh={() => loadMediaHistory(activeCompanion.id)}
              />

              <Card>
                <CardHeader
                  title="Preview"
                  subtitle="Latest generated image or video preview."
                />
                <CardBody>
                  {previewUrl ? (
                    /\.(mp4|webm|mov)(\?|$)/i.test(previewUrl) ? (
                      <video
                        controls
                        className="w-full rounded-2xl border border-zinc-800"
                      >
                        <source src={previewUrl} />
                      </video>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt="Generated preview"
                        className="w-full rounded-2xl border border-zinc-800 object-cover"
                      />
                    )
                  ) : (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
                      No preview yet.
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Media history"
                  subtitle="Favorite or delete generated media for this companion."
                />
                <CardBody>
                  <div className="space-y-3">
                    {loadingHistory ? (
                      <div className="text-sm text-zinc-400">
                        Loading history...
                      </div>
                    ) : mediaHistory.length === 0 ? (
                      <div className="text-sm text-zinc-500">
                        No generated media yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {mediaHistory.map((item) => {
                          const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(
                            item.url,
                          );

                          return (
                            <div
                              key={item.id}
                              className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                            >
                              <button
                                type="button"
                                onClick={() => setPreviewUrl(item.url)}
                                className="block w-full text-left"
                              >
                                <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                                  {isVideo ? (
                                    <video
                                      className="h-full w-full object-cover"
                                      muted
                                    >
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
                              </button>

                              <div className="space-y-2 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] text-zinc-300">
                                    {item.type}
                                  </span>
                                  <Badge
                                    tone={
                                      item.contentRating === "ADULT"
                                        ? "adult"
                                        : "safe"
                                    }
                                  >
                                    {item.contentRating}
                                  </Badge>
                                </div>

                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={
                                      item.isFavorite ? "primary" : "secondary"
                                    }
                                    className="px-2 py-1 text-xs"
                                    onClick={() => toggleFavorite(item)}
                                  >
                                    {item.isFavorite
                                      ? "★ Favorite"
                                      : "☆ Favorite"}
                                  </Button>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    className="px-2 py-1 text-xs"
                                    onClick={() => deleteMedia(item)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </>
          ) : null}
        </aside>
      </div>
    </main>
  );
}
