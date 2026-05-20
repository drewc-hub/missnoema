"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardBody, CardHeader, Button, Badge } from "@/components/ui";
import { MediaGenPanel } from "@/components/MediaGenPanel";
import type {
  Companion,
  ChatMessage,
  ConversationMemory,
  MediaHistoryItem,
  UserFact,
} from "@/components/chat/types";
import { useChatStream } from "@/components/chat/useChatStream";
import { CompanionSidebar } from "@/components/chat/CompanionSidebar";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";

const VOICE_PRESET_SETTINGS: Record<
  string,
  { pitch: number; rate: number; femaleHint: boolean }
> = {
  "soft-young": { pitch: 1.25, rate: 1.0, femaleHint: true },
  "warm-sultry": { pitch: 0.9, rate: 0.82, femaleHint: true },
  "deep-breathy": { pitch: 0.85, rate: 0.88, femaleHint: true },
  "playful-energetic": { pitch: 1.2, rate: 1.12, femaleHint: true },
  "mature-refined": { pitch: 0.92, rate: 0.9, femaleHint: false },
  "older-distinguished": { pitch: 0.78, rate: 0.85, femaleHint: false },
  "dark-mysterious": { pitch: 0.82, rate: 0.88, femaleHint: false },
};

function speakMessageInternal(
  text: string,
  voicePreset?: string | null,
  gender?: string | null
) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const preset = voicePreset ? VOICE_PRESET_SETTINGS[voicePreset] : null;
  const isFemale = preset
    ? preset.femaleHint
    : !gender || gender === "female" || gender === "non-binary";

  utter.pitch = preset?.pitch ?? (isFemale ? 1.1 : 0.9);
  utter.rate = preset?.rate ?? 1.0;

  function assignAndSpeak() {
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) =>
      isFemale
        ? /female|woman|girl|zira|samantha|victoria|fiona|karen|moira|veena|tessa/i.test(
            v.name
          )
        : /male|man|daniel|david|alex|fred|ralph|thomas|lekha|rishi/i.test(v.name)
    );
    if (preferred) utter.voice = preferred;
    utter.onerror = () => {};
    setTimeout(() => {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utter);
    }, 50);
  }

  if (window.speechSynthesis.getVoices().length > 0) {
    assignAndSpeak();
  } else {
    window.speechSynthesis.addEventListener("voiceschanged", assignAndSpeak, {
      once: true,
    });
  }
}

export function CompanionChatWorkspace({
  allowAdult,
  initialCompanionId,
}: {
  allowAdult: boolean;
  initialCompanionId?: string;
}) {
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [companionSearch, setCompanionSearch] = useState("");
  const [activeId, setActiveId] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [memory, setMemory] = useState<ConversationMemory | null>(null);
  const [companionMood, setCompanionMood] = useState<0 | 1 | 2 | 3>(0);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [mediaHistory, setMediaHistory] = useState<MediaHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveInfo, setSaveInfo] = useState<{
    total: number;
    limit: number | null;
    coinBalance: number;
    coinCost: number;
  } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [oocBubbles, setOocBubbles] = useState<{ id: string; text: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dailyUsed, setDailyUsed] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [userFacts, setUserFacts] = useState<UserFact[]>([]);
  const [lightboxItem, setLightboxItem] = useState<MediaHistoryItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [coinPromptMsg, setCoinPromptMsg] = useState<ChatMessage | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  const { sending, error, setError, streamRequest } = useChatStream();

  const activeCompanion = useMemo(
    () => companions.find((c) => c.id === activeId) ?? null,
    [companions, activeId]
  );

  const filteredCompanions = useMemo(() => {
    const q = companionSearch.trim().toLowerCase();
    if (!q) return companions;

    return companions.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [companions, companionSearch]);

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
      setCompanions(items);

      setActiveId((current) => {
        if (!current) {
          const preferred =
            initialCompanionId && items.find((c: Companion) => c.id === initialCompanionId);
          return preferred ? preferred.id : items[0]?.id ?? "";
        }
        return current;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load companions.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadConversation() {
    if (!activeId) {
      setMessages([]);
      setMemory(null);
      setCompanionMood(0);
      setMediaHistory([]);
      setLightboxItem(null);
      setSuggestions([]);
      setUserFacts([]);
      setSavedIds(new Set());
      setSaveInfo(null);
      setDailyUsed(null);
      setDailyLimit(null);
      return;
    }

    try {
      setLoadingConversation(true);
      setError(null);

      const [conversationRes, suggestionRes] = await Promise.all([
        fetch(`/api/chat/session?companionId=${encodeURIComponent(activeId)}`),
        fetch(`/api/chat/suggestions?companionId=${encodeURIComponent(activeId)}`),
      ]);

      const conversationData = await conversationRes.json().catch(() => null);
      const suggestionData = await suggestionRes.json().catch(() => null);

      if (!conversationRes.ok) {
        throw new Error(conversationData?.error || "Failed to load conversation.");
      }

      const loadedMessages = conversationData?.conversation?.messages ?? [];
      setMessages(loadedMessages);
      setMemory({
        id: conversationData.conversation.id,
        familiarity: conversationData.conversation.familiarity,
        trust: conversationData.conversation.trust,
        intimacy: conversationData.conversation.intimacy,
        kinkLevel: conversationData.conversation.kinkLevel ?? 0,
        relationshipLevel: conversationData.conversation.relationshipLevel ?? 1,
        summary: conversationData.conversation.summary ?? null,
      });

      if (
        typeof conversationData.conversation.companionMood === "number" &&
        conversationData.conversation.companionMood >= 0 &&
        conversationData.conversation.companionMood <= 3
      ) {
        setCompanionMood(conversationData.conversation.companionMood);
      }

      if (suggestionRes.ok) {
        setSuggestions(
          Array.isArray(suggestionData?.suggestions) ? suggestionData.suggestions : []
        );
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversation.");
    } finally {
      setLoadingConversation(false);
    }
  }

  async function sendMessage() {
    if (!activeCompanion || sending) return;

    const userText = input.trim();
    if (!userText) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "" },
    ]);
    setInput("");
    setError(null);

    await streamRequest({
      companionId: activeCompanion.id,
      message: userText,
      onChunk(text) {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = { ...last, content: last.content + text };
          }
          return next;
        });
      },
      onDone(event) {
        if (typeof event.moodTier === "number" && event.moodTier >= 0 && event.moodTier <= 3) {
          setCompanionMood(event.moodTier as 0 | 1 | 2 | 3);
        }

        if (typeof event.dailyUsed === "number") setDailyUsed(event.dailyUsed);
        if (typeof event.dailyLimit === "number") setDailyLimit(event.dailyLimit);

        if (event.memory && typeof event.memory === "object") {
          const m = event.memory as Record<string, unknown>;
          setMemory({
            id: String(m.id ?? ""),
            familiarity: Number(m.familiarity ?? 0),
            trust: Number(m.trust ?? 0),
            intimacy: Number(m.intimacy ?? 0),
            kinkLevel: Number(m.kinkLevel ?? 0),
            relationshipLevel: Number(m.relationshipLevel ?? 1),
            summary: (m.summary as string | null) ?? null,
          });
        }

        if (typeof event.userMsgId === "string" || typeof event.assistantMsgId === "string") {
          setMessages((prev) => {
            const next = [...prev];
            const assistantIdx = next.length - 1;
            const userIdx = next.length - 2;

            if (
              typeof event.assistantMsgId === "string" &&
              next[assistantIdx]?.role === "assistant"
            ) {
              next[assistantIdx] = {
                ...next[assistantIdx],
                id: event.assistantMsgId,
              };
            }

            if (typeof event.userMsgId === "string" && next[userIdx]?.role === "user") {
              next[userIdx] = { ...next[userIdx], id: event.userMsgId };
            }

            return next;
          });
        }
      },
    });
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
  }

  async function pinMessage(_m: ChatMessage, _pin: boolean) {}
  async function rerunReply(_m?: ChatMessage) {}
  async function handleSaveMessage(_m: ChatMessage, _useCoin = false) {}

  useEffect(() => {
    void loadCompanions();
  }, [initialCompanionId]);

  useEffect(() => {
    void loadConversation();
  }, [activeId]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <main className="mx-auto w-full max-w-6xl">
      <div className="mb-3 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.98]"
        >
          <svg
            className="h-4 w-4 shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 4h12M2 8h8M2 12h6" strokeLinecap="round" />
          </svg>
          {activeCompanion ? activeCompanion.name : "Choose companion"}
        </button>
        {activeCompanion ? (
          <Badge tone={activeCompanion.contentRating === "ADULT" ? "adult" : "safe"}>
            {activeCompanion.contentRating}
          </Badge>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <CompanionSidebar
          companions={companions}
          filteredCompanions={filteredCompanions}
          companionSearch={companionSearch}
          setCompanionSearch={setCompanionSearch}
          loadingList={loadingList}
          activeId={activeId}
          setActiveId={setActiveId}
          setSidebarOpen={setSidebarOpen}
          setDeleteConfirmId={setDeleteConfirmId}
          activeCompanion={activeCompanion}
          mediaHistory={mediaHistory}
          loadingHistory={loadingHistory}
          setLightboxItem={setLightboxItem}
        />

        <section className="space-y-4 lg:col-span-6">
          {activeCompanion ? (
            <Card>
              <CardHeader
                title={activeCompanion.name}
                subtitle="Current companion"
                right={
                  <Badge
                    tone={activeCompanion.contentRating === "ADULT" ? "adult" : "safe"}
                  >
                    {activeCompanion.contentRating}
                  </Badge>
                }
              />
              <CardBody>
                <div className="text-sm text-zinc-300">{activeCompanion.description}</div>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              title="Chat"
              subtitle={
                [
                  dailyLimit !== null && dailyUsed !== null
                    ? `${dailyUsed}/${dailyLimit} messages today`
                    : null,
                  saveInfo
                    ? saveInfo.limit === null
                      ? "Unlimited saves"
                      : `${saveInfo.total}/${saveInfo.limit} saves`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "Edit, rerun or re-speak any reply."
              }
            />
            <CardBody>
              <div className="space-y-4">
                {memory ? (
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                    Bond Lv. {memory.relationshipLevel}
                  </div>
                ) : null}

                <ChatMessageList
                  messages={messages}
                  activeCompanion={activeCompanion}
                  loadingConversation={loadingConversation}
                  editingIndex={editingIndex}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  startEditMessage={startEditMessage}
                  cancelEdit={cancelEdit}
                  saveEdit={saveEdit}
                  pinMessage={pinMessage}
                  rerunReply={rerunReply}
                  handleSaveMessage={handleSaveMessage}
                  savedIds={savedIds}
                  savingId={savingId}
                  sending={sending}
                  speakMessage={(text) =>
                    speakMessageInternal(text, activeCompanion?.profile?.voice, activeCompanion?.gender)
                  }
                  messagesContainerRef={messagesContainerRef}
                  oocBubbles={oocBubbles}
                />

                <ChatComposer
                  input={input}
                  setInput={setInput}
                  sending={sending}
                  disabled={!input.trim() || sending || !activeCompanion}
                  onSend={sendMessage}
                  messageInputRef={messageInputRef}
                />

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
              onGenerated={() => undefined}
              onHistoryRefresh={() => undefined}
            />
          ) : null}
        </aside>
      </div>

      {deleteConfirmId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-100">Remove companion?</div>
          </div>
        </div>
      ) : null}

      {resetConfirmId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setResetConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-100">Reset conversation?</div>
          </div>
        </div>
      ) : null}

      {coinPromptMsg ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setCoinPromptMsg(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-100">Save limit reached</div>
          </div>
        </div>
      ) : null}

      {lightboxItem ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxItem(null)}
        >
          <div
            className="relative max-h-[90vh] w-full max-w-4xl"
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
          </div>
        </div>
      ) : null}
    </main>
  );
}
