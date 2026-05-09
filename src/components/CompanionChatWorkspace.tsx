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
  SidebarCompanionSkeleton,
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
    utter.onerror = () => {};
    setTimeout(() => {
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utter);
    }, 50);
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
  isPinned?: boolean;
};

type UserFact = {
  id: string;
  fact: string;
  companionId: string | null;
  createdAt: string;
};

type ConversationMemory = {
  id: string;
  familiarity: number;
  trust: number;
  intimacy: number;
  kinkLevel: number;
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
  isCover: boolean;
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

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [saveInfo, setSaveInfo] = useState<{ total: number; limit: number | null; coinBalance: number; coinCost: number } | null>(null);
  const [coinPromptMsg, setCoinPromptMsg] = useState<ChatMessage | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [resetConfirmId, setResetConfirmId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const [oocOpen, setOocOpen] = useState(false);
  const [oocText, setOocText] = useState("");
  // OOC bubbles are shown in-line but never stored in DB
  const [oocBubbles, setOocBubbles] = useState<{ id: string; text: string }[]>([]);

  const [dailyUsed, setDailyUsed] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);

  const [userFacts, setUserFacts] = useState<UserFact[]>([]);
  const [factsOpen, setFactsOpen] = useState(false);
  const [newFact, setNewFact] = useState("");
  const [savingFact, setSavingFact] = useState(false);
  const [deletingFactId, setDeletingFactId] = useState<string | null>(null);
  const [levelUpNotif, setLevelUpNotif] = useState<{ level: number; nextLevel: number; coinsEarned: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  async function loadSavedIds(conversationId: string) {
    try {
      const res = await fetch(`/api/saved-messages?conversationId=${encodeURIComponent(conversationId)}`);
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setSavedIds(new Set(data.ids ?? []));
        setSaveInfo({ total: data.total, limit: data.limit, coinBalance: data.coinBalance, coinCost: data.coinCost });
      }
    } catch {
      // non-critical
    }
  }

  async function loadDailyCount() {
    try {
      const res = await fetch("/api/me/message-count");
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setDailyUsed(data.used ?? null);
        setDailyLimit(data.limit ?? null);
      }
    } catch {
      // non-critical
    }
  }

  async function loadFacts(companionId: string) {
    try {
      const res = await fetch(`/api/facts?companionId=${encodeURIComponent(companionId)}`);
      const data = await res.json().catch(() => null);
      if (res.ok) setUserFacts(data.facts ?? []);
    } catch {
      // non-critical
    }
  }

  async function addFact() {
    if (!newFact.trim() || !activeCompanion || savingFact) return;
    setSavingFact(true);
    try {
      const res = await fetch("/api/facts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fact: newFact.trim(), companionId: activeCompanion.id }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.fact) {
        setUserFacts((prev) => [...prev, data.fact]);
        setNewFact("");
      } else {
        setError(data?.error || "Failed to save fact.");
      }
    } finally {
      setSavingFact(false);
    }
  }

  async function deleteFact(factId: string) {
    setDeletingFactId(factId);
    try {
      const res = await fetch(`/api/facts/${factId}`, { method: "DELETE" });
      if (res.ok) setUserFacts((prev) => prev.filter((f) => f.id !== factId));
    } finally {
      setDeletingFactId(null);
    }
  }

  async function pinMessage(m: ChatMessage, pin: boolean) {
    if (!m.id) return;
    try {
      const res = await fetch(`/api/chat/messages/${m.id}/pin`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isPinned: pin }),
      });
      if (res.ok) {
        setMessages((prev) => prev.map((msg) => msg.id === m.id ? { ...msg, isPinned: pin } : msg));
      }
    } catch {
      // non-critical
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

  async function setCover(item: MediaHistoryItem) {
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isCover: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to set cover.");

      // Clear isCover from all items, then mark this one
      setMediaHistory((prev) => prev.map((x) => ({ ...x, isCover: x.id === item.id })));
      setLightboxItem((prev) => prev?.id === item.id ? { ...prev, isCover: true } : prev ? { ...prev, isCover: false } : prev);

      // Refresh companion list so thumbnail updates immediately
      setCompanions((prev) =>
        prev.map((c) =>
          c.id === activeCompanion?.id ? { ...c, thumbnailUrl: item.url } : c,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set cover.");
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

        const loadedMessages = conversationData?.conversation?.messages ?? [];
        setMessages(loadedMessages);
        setMemory({
          id: conversationData.conversation.id,
          familiarity: conversationData.conversation.familiarity,
          trust: conversationData.conversation.trust,
          intimacy: conversationData.conversation.intimacy,
          kinkLevel: conversationData.conversation.kinkLevel ?? 0,
          summary: conversationData.conversation.summary ?? null,
        });

        if (loadedMessages.length === 0) {
          requestIntro(activeId);
        }

        if (suggestionRes.ok) {
          setSuggestions(
            Array.isArray(suggestionData?.suggestions)
              ? suggestionData.suggestions
              : [],
          );
        } else {
          setSuggestions([]);
        }

        await Promise.all([
          loadMediaHistory(activeId),
          loadSavedIds(conversationData.conversation.id),
          loadFacts(activeId),
          loadDailyCount(),
        ]);
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

          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue; // skip malformed JSON only
          }

          if (event.type === "chunk") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + (event.text as string) };
              }
              return next;
            });
          } else if (event.type === "done") {
            if (typeof event.moodTier === "number" && event.moodTier >= 0 && event.moodTier <= 3) {
              setCompanionMood(event.moodTier as 0 | 1 | 2 | 3);
            }
            if (event.memory && typeof event.memory === "object") {
              const m = event.memory as Record<string, unknown>;
              setMemory({
                id: (m.id as string) ?? memory?.id ?? "",
                familiarity: m.familiarity as number,
                trust: m.trust as number,
                intimacy: m.intimacy as number,
                kinkLevel: typeof m.kinkLevel === "number" ? m.kinkLevel : (memory?.kinkLevel ?? 0),
                summary: (m.summary as string | null) ?? null,
              });
            }
            if (typeof event.dailyUsed === "number") setDailyUsed(event.dailyUsed);
            if (typeof event.dailyLimit === "number") setDailyLimit(event.dailyLimit);
            if (event.levelUp && typeof event.levelUp === "object") {
              const lu = event.levelUp as { level: number; nextLevel: number; coinsEarned: number };
              setLevelUpNotif(lu);
              setTimeout(() => setLevelUpNotif(null), 7000);
            }
            // Stamp DB IDs onto the optimistic messages so they can be edited/rerun
            if (typeof event.userMsgId === "string" || typeof event.assistantMsgId === "string") {
              setMessages((prev) => {
                const next = [...prev];
                // Last two messages are the just-sent user + assistant pair
                const assistantIdx = next.length - 1;
                const userIdx = next.length - 2;
                if (typeof event.assistantMsgId === "string" && next[assistantIdx]?.role === "assistant") {
                  next[assistantIdx] = { ...next[assistantIdx], id: event.assistantMsgId as string };
                }
                if (typeof event.userMsgId === "string" && next[userIdx]?.role === "user") {
                  next[userIdx] = { ...next[userIdx], id: event.userMsgId as string };
                }
                return next;
              });
            }
          } else if (event.type === "error") {
            // Throw outside the JSON parse try/catch so it reaches the outer handler
            throw new Error((event.error as string) || "Chat failed.");
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

  async function sendOoc() {
    const text = oocText.trim();
    if (!text || !activeCompanion || sending) return;

    const bubbleId = crypto.randomUUID();
    setOocBubbles((prev) => [...prev, { id: bubbleId, text }]);
    setOocText("");
    setOocOpen(false);
    setSending(true);
    setError(null);

    // Append an empty assistant placeholder
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companionId: activeCompanion.id, ooc: text }),
      });

      if (!res.ok || !res.body) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "OOC direction failed.");
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
          let event: Record<string, unknown>;
          try { event = JSON.parse(line.slice(6)); } catch { continue; }

          if (event.type === "chunk") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + (event.text as string) };
              }
              return next;
            });
          } else if (event.type === "done") {
            if (typeof event.moodTier === "number") setCompanionMood(event.moodTier as 0 | 1 | 2 | 3);
            if (typeof event.assistantMsgId === "string") {
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") next[next.length - 1] = { ...last, id: event.assistantMsgId as string };
                return next;
              });
            }
          } else if (event.type === "error") {
            throw new Error((event.error as string) || "OOC direction failed.");
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" && !last.content ? prev.slice(0, -1) : prev;
      });
      setOocBubbles((prev) => prev.filter((b) => b.id !== bubbleId));
      setError(err instanceof Error ? err.message : "OOC direction failed.");
    } finally {
      setSending(false);
    }
  }

  async function requestIntro(companionId: string) {
    setMessages([{ role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat/intro", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companionId }),
      });

      if (!res.ok || !res.body) { setMessages([]); return; }

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
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line.slice(6));
          } catch { continue; }
          if (event.type === "skip") { setMessages([]); return; }
          if (event.type === "chunk") {
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant") {
                next[next.length - 1] = { ...last, content: last.content + (event.text as string) };
              }
              return next;
            });
          }
        }
      }
    } catch {
      setMessages([]);
    }
  }

  async function refreshSuggestions() {
    if (!activeCompanion || loadingSuggestion) return;
    setLoadingSuggestion(true);
    try {
      const res = await fetch("/api/chat/suggestions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companionId: activeCompanion.id,
          messages: messages.slice(-12),
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

  async function rerunReply(message?: ChatMessage) {
    if (sending || !memory) return;

    try {
      setSending(true);
      setError(null);

      let res: Response;

      if (message?.role === "user" && message.id) {
        // Re-generate the companion reply to a specific user message
        res = await fetch("/api/chat/rewrite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ messageId: message.id, content: message.content, rerun: true }),
        });
      } else {
        // Re-generate the last assistant reply (works for all assistant messages)
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

  async function confirmDeleteCompanion() {
    if (!deleteConfirmId) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/chat/session/delete?companionId=${encodeURIComponent(deleteConfirmId)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to remove companion.");
        return;
      }
      setCompanions((prev) => prev.filter((c) => c.id !== deleteConfirmId));
      if (activeId === deleteConfirmId) {
        setActiveId("");
        setMessages([]);
        setMemory(null);
      }
      setDeleteConfirmId(null);
    } finally {
      setActionPending(false);
    }
  }

  async function confirmResetConversation() {
    if (!resetConfirmId) return;
    setActionPending(true);
    try {
      const res = await fetch(`/api/chat/session/reset?companionId=${encodeURIComponent(resetConfirmId)}`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error || "Failed to reset conversation.");
        return;
      }
      setMessages([]);
      setMemory((prev) => prev ? { ...prev, familiarity: 0, trust: 0, intimacy: 0, kinkLevel: 0, summary: null } : null);
      setSuggestions([]);
      setResetConfirmId(null);
    } finally {
      setActionPending(false);
    }
  }

  async function handleSaveMessage(m: ChatMessage, useCoin = false) {
    if (!m.id || !activeCompanion) return;
    setSavingId(m.id);
    try {
      const res = await fetch("/api/saved-messages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messageId: m.id,
          content: m.content,
          companionId: activeCompanion.id,
          companionName: activeCompanion.name,
          useCoin,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok && !data?.limitReached) {
        setError(data?.error || "Failed to save message.");
        return;
      }
      if (data?.limitReached) {
        setCoinPromptMsg(m);
        return;
      }
      if (data?.saved) {
        setSavedIds((prev) => new Set([...prev, m.id!]));
        setSaveInfo((prev) => prev ? { ...prev, total: prev.total + 1, coinBalance: data.newCoinBalance ?? prev.coinBalance } : prev);
      } else {
        setSavedIds((prev) => { const next = new Set(prev); next.delete(m.id!); return next; });
        setSaveInfo((prev) => prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev);
      }
      setCoinPromptMsg(null);
    } finally {
      setSavingId(null);
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
      {/* Mobile companion picker bar — visible only on small screens */}
      <div className="mb-3 flex items-center gap-2 lg:hidden">
        <button
          type="button"
          onClick={() => setSidebarOpen((o) => !o)}
          className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 transition-all duration-200 hover:border-zinc-500 hover:bg-zinc-800 active:scale-[0.98]"
        >
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M2 4h12M2 8h8M2 12h6" strokeLinecap="round" />
          </svg>
          {activeCompanion ? activeCompanion.name : "Choose companion"}
        </button>
        {activeCompanion && (
          <Badge tone={activeCompanion.contentRating === "ADULT" ? "adult" : "safe"}>
            {activeCompanion.contentRating}
          </Badge>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <aside className={`space-y-4 lg:col-span-3 ${sidebarOpen ? "block" : "hidden"} lg:block`}>
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
                  <div className="space-y-2">
                    <SidebarCompanionSkeleton />
                    <SidebarCompanionSkeleton />
                    <SidebarCompanionSkeleton />
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
                  <div key={c.id} className="group relative">
                    <button
                      type="button"
                      onClick={() => { setActiveId(c.id); setSidebarOpen(false); }}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 pr-8 ${
                        c.id === activeId
                          ? "border-zinc-300 bg-zinc-800"
                          : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                          {c.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-zinc-600">
                              {c.name[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-zinc-100 truncate">{c.name}</div>
                            <Badge
                              tone={c.contentRating === "ADULT" ? "adult" : "safe"}
                            >
                              {c.contentRating}
                            </Badge>
                          </div>
                          <div className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                            {c.description}
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(c.id); }}
                      className="absolute right-2 top-2 rounded p-1 text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-900/20 transition"
                      title="Remove companion"
                    >
                      🗑
                    </button>
                  </div>
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
                        className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-all duration-200 hover:border-zinc-600 hover:shadow-md"
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
                          {item.type} {item.isCover ? "🖼" : item.isFavorite ? "★" : ""}
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
              subtitle={[
                dailyLimit !== null && dailyUsed !== null
                  ? `${dailyUsed}/${dailyLimit} messages today`
                  : dailyLimit === null && dailyUsed !== null
                  ? "Unlimited messages"
                  : null,
                saveInfo
                  ? saveInfo.limit === null
                    ? "Unlimited saves"
                    : `${saveInfo.total}/${saveInfo.limit} saves`
                  : null,
              ].filter(Boolean).join(" · ") || "Edit, rerun or re-speak any reply."
              }
              right={
                activeCompanion && memory ? (
                  <button
                    type="button"
                    onClick={() => setResetConfirmId(activeCompanion.id)}
                    className="rounded-lg border border-zinc-700 px-2.5 py-1 text-xs text-zinc-400 hover:border-red-800/60 hover:bg-red-900/20 hover:text-red-300 transition"
                  >
                    Reset chat
                  </button>
                ) : undefined
              }
            />

            <CardBody>
              <div className="space-y-4">
                {memory ? (
                  <>
                    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 space-y-2">
                      {[
                        { label: "Familiarity", value: memory.familiarity, color: "bg-blue-500", show: true },
                        { label: "Trust", value: memory.trust, color: "bg-emerald-500", show: true },
                        { label: "Intimacy", value: memory.intimacy, color: "bg-rose-500", show: true },
                        { label: "Kink", value: memory.kinkLevel, color: "bg-violet-500", show: activeCompanion?.contentRating === "ADULT" },
                      ].filter((s) => s.show).map(({ label, value, color }) => (
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
                    <div className="space-y-3 animate-pulse">
                      <div className="ml-10 h-12 rounded-xl bg-zinc-800/60" />
                      <div className="mr-10 h-16 rounded-xl bg-zinc-800/40" />
                      <div className="ml-10 h-10 rounded-xl bg-zinc-800/60" />
                      <div className="mr-10 h-20 rounded-xl bg-zinc-800/40" />
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
                                    onClick={() => rerunReply(m)}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-200 transition disabled:opacity-40"
                                    title="Regenerate reply"
                                  >
                                    ↺
                                  </button>
                                  {m.id ? (
                                    <button
                                      type="button"
                                      disabled={savingId === m.id}
                                      onClick={() => handleSaveMessage(m)}
                                      className={`text-[11px] transition disabled:opacity-40 ${
                                        savedIds.has(m.id)
                                          ? "text-amber-400 hover:text-amber-200"
                                          : "text-zinc-500 hover:text-zinc-200"
                                      }`}
                                      title={savedIds.has(m.id) ? "Unsave" : saveInfo && saveInfo.limit !== null && saveInfo.total >= saveInfo.limit ? `Save (${saveInfo.coinCost} coins)` : "Save"}
                                    >
                                      {savedIds.has(m.id) ? "🔖 Saved" : "Save"}
                                    </button>
                                  ) : null}
                                </>
                              ) : null}
                              {m.id ? (
                                <button
                                  type="button"
                                  onClick={() => pinMessage(m, !m.isPinned)}
                                  className={`text-[11px] transition ${m.isPinned ? "text-amber-400 hover:text-amber-200" : "text-zinc-500 hover:text-zinc-200"}`}
                                  title={m.isPinned ? "Unpin (remove from always-in-context)" : "Pin (always include in AI context)"}
                                >
                                  {m.isPinned ? "📌" : "Pin"}
                                </button>
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
                  {oocBubbles.map((b) => (
                    <div key={b.id} className="mx-4 rounded-lg border border-dashed border-zinc-700 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-500 italic">
                      <span className="not-italic font-medium text-zinc-600 mr-1">[OOC]</span>{b.text}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-zinc-400">Draft replies</div>
                    <button
                      type="button"
                      onClick={refreshSuggestions}
                      disabled={loadingSuggestion || !activeCompanion || messages.length === 0}
                      className="rounded-lg border border-blue-900/60 bg-blue-950/40 px-2.5 py-1 text-xs text-blue-300 hover:bg-blue-900/50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      {loadingSuggestion ? "Drafting…" : "✦ Generate drafts"}
                    </button>
                  </div>
                  {suggestions.length > 0 && (
                    <div className="space-y-2">
                      {suggestions.map((s, i) => (
                        <div
                          key={i}
                          className="group flex items-start gap-2 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-medium text-zinc-500 mb-1">
                              Option {i + 1}
                            </div>
                            <p className="text-sm text-zinc-300 leading-relaxed">{s}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setInput(s)}
                            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition mt-0.5"
                          >
                            Use
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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

                {activeCompanion ? (
                  <div>
                    <button
                      type="button"
                      onClick={() => setOocOpen((v) => !v)}
                      className="text-[11px] text-zinc-600 hover:text-zinc-400 transition"
                    >
                      {oocOpen ? "▲ Hide OOC" : "▼ Out-of-character direction"}
                    </button>
                    {oocOpen ? (
                      <div className="mt-2 flex gap-2">
                        <input
                          value={oocText}
                          onChange={(e) => setOocText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendOoc(); } }}
                          placeholder="Direct the scene — e.g. 'shift the mood to something lighter'"
                          className="flex-1 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={!oocText.trim() || sending}
                          onClick={sendOoc}
                          className="text-xs px-3 py-2 border border-dashed border-zinc-700"
                        >
                          Direct
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {dailyLimit !== null && dailyUsed !== null && dailyUsed >= dailyLimit ? (
                  <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-3 text-sm text-amber-200">
                    Daily message limit reached ({dailyLimit} messages). Resets at midnight. Upgrade your plan for more.
                  </div>
                ) : null}

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

          {activeCompanion ? (
            <Card>
              <CardHeader
                title="Saved facts"
                subtitle={`${userFacts.length} fact${userFacts.length === 1 ? "" : "s"} · always in context`}
                right={
                  <button
                    type="button"
                    onClick={() => setFactsOpen((v) => !v)}
                    className="text-xs text-zinc-400 hover:text-zinc-200 transition"
                  >
                    {factsOpen ? "▲ Collapse" : "▼ Expand"}
                  </button>
                }
              />
              {factsOpen ? (
                <CardBody className="space-y-3">
                  <div className="text-xs text-zinc-500">
                    Always injected into the AI context — name, kinks, limits, anything you want remembered.
                  </div>

                  {userFacts.length > 0 ? (
                    <ul className="space-y-1.5">
                      {userFacts.map((f) => (
                        <li key={f.id} className="flex items-start gap-2 rounded-lg bg-zinc-900 px-2.5 py-2 text-xs text-zinc-300">
                          <span className="flex-1 break-words">{f.fact}</span>
                          <button
                            type="button"
                            disabled={deletingFactId === f.id}
                            onClick={() => deleteFact(f.id)}
                            className="shrink-0 text-zinc-600 hover:text-red-400 transition disabled:opacity-40"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-zinc-600">No facts yet — add one below or use a quick-add template.</div>
                  )}

                  {/* Quick-add templates */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-600">Quick add</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "My name", template: "My name is " },
                        { label: "Birthday", template: "My birthday is " },
                        { label: "Kinks", template: "My kinks include: " },
                        { label: "Bondage", template: "I enjoy bondage and restraint play" },
                        { label: "CBT", template: "I enjoy CBT (cock and ball torture)" },
                        { label: "Foot worship", template: "I enjoy foot worship" },
                        { label: "Hard limits", template: "My hard limits are: " },
                        { label: "Soft limits", template: "My soft limits are: " },
                        { label: "Prefer called", template: "I prefer to be called " },
                        { label: "Pronouns", template: "My pronouns are " },
                        { label: "Role", template: "In roleplay I prefer the role of " },
                      ].map(({ label, template }) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setNewFact(template)}
                          className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[10px] text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition"
                        >
                          + {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <input
                      value={newFact}
                      onChange={(e) => setNewFact(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFact(); } }}
                      placeholder="e.g. My name is Alex"
                      maxLength={500}
                      className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                    />
                    <Button
                      type="button"
                      disabled={!newFact.trim() || savingFact}
                      onClick={addFact}
                      className="text-xs px-3 shrink-0"
                    >
                      {savingFact ? "…" : "Add"}
                    </Button>
                  </div>
                </CardBody>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>

      {deleteConfirmId ? (() => {
        const c = companions.find((x) => x.id === deleteConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setDeleteConfirmId(null)}>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="text-base font-semibold text-zinc-100">Remove companion?</div>
              <div className="text-sm text-zinc-400">
                This will remove <span className="text-zinc-200 font-medium">{c?.name ?? "this companion"}</span> and your entire conversation history with them. This cannot be undone.
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" disabled={actionPending} className="bg-red-900/40 text-red-300 hover:bg-red-900/70 border-red-800/60" onClick={confirmDeleteCompanion}>
                  {actionPending ? "Removing…" : "Remove"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setDeleteConfirmId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        );
      })() : null}

      {resetConfirmId ? (() => {
        const c = companions.find((x) => x.id === resetConfirmId);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setResetConfirmId(null)}>
            <div className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
              <div className="text-base font-semibold text-zinc-100">Reset conversation?</div>
              <div className="text-sm text-zinc-400">
                All messages and relationship progress with <span className="text-zinc-200 font-medium">{c?.name ?? "this companion"}</span> will be permanently deleted. The companion stays in your list.
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="secondary" disabled={actionPending} className="bg-red-900/40 text-red-300 hover:bg-red-900/70 border-red-800/60" onClick={confirmResetConversation}>
                  {actionPending ? "Resetting…" : "Reset"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setResetConfirmId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        );
      })() : null}

      {levelUpNotif ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-start gap-3 rounded-2xl border border-violet-500/50 bg-zinc-900/95 px-6 py-4 shadow-2xl backdrop-blur-sm text-center min-w-[260px]">
          <div className="w-full">
            <div className="text-base font-bold text-violet-300">Bond Level {levelUpNotif.level} Complete!</div>
            <div className="text-sm text-zinc-300 mt-1">Your connection has deepened. Starting Level {levelUpNotif.nextLevel}.</div>
            <div className="text-sm text-yellow-400 mt-1">+{levelUpNotif.coinsEarned} coins rewarded 🪙</div>
          </div>
          <button onClick={() => setLevelUpNotif(null)} className="text-zinc-600 hover:text-zinc-400 text-lg leading-none shrink-0">×</button>
        </div>
      ) : null}

      {coinPromptMsg ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setCoinPromptMsg(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-base font-semibold text-zinc-100">Save limit reached</div>
            <div className="text-sm text-zinc-400">
              You&apos;ve used all {saveInfo?.limit} saves on your plan.
              Spend <span className="text-amber-400 font-medium">{saveInfo?.coinCost} coins</span> to save this message.
            </div>
            <div className="text-xs text-zinc-500">
              Your balance: <span className="text-zinc-300">{saveInfo?.coinBalance ?? 0} coins</span>
            </div>
            {saveInfo && (saveInfo.coinBalance ?? 0) < (saveInfo.coinCost ?? 5) ? (
              <div className="text-xs text-red-400">Not enough coins. Top up in Account → Billing.</div>
            ) : null}
            <div className="flex gap-3">
              <Button
                type="button"
                disabled={!saveInfo || (saveInfo.coinBalance ?? 0) < (saveInfo.coinCost ?? 5) || savingId === coinPromptMsg.id}
                onClick={() => handleSaveMessage(coinPromptMsg, true)}
              >
                {savingId === coinPromptMsg.id ? "Saving…" : `Spend ${saveInfo?.coinCost} coins`}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setCoinPromptMsg(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

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
                {lightboxItem.type === "IMAGE" ? (
                  <Button
                    type="button"
                    variant={lightboxItem.isCover ? "primary" : "secondary"}
                    className="px-3 py-1.5 text-xs"
                    onClick={() => setCover(lightboxItem)}
                    disabled={lightboxItem.isCover}
                  >
                    {lightboxItem.isCover ? "✓ Cover photo" : "Set as cover"}
                  </Button>
                ) : null}
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
