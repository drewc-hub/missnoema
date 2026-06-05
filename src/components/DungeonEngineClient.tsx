"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Crown,
  Dice5,
  Globe2,
  Lock,
  MessageSquare,
  ScrollText,
  Shield,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { WorldFactionPanel } from "@/components/WorldFactionPanel";
import { WorldInviteManager } from "@/components/WorldInviteManager";
import { WorldMemberRoleControl } from "@/components/WorldMemberRoleControl";

type WorldRole = "HOST" | "PLAYER";
type RoomMessageRole = "USER" | "NARRATOR" | "SYSTEM";

type RoomMessage = {
  id: string;
  role: RoomMessageRole;
  content: string;
  createdAt: string | Date;
  authorUser: {
    id: string;
    displayName: string | null;
    email: string | null;
  } | null;
};

type WorldMember = {
  userId: string;
  role: WorldRole;
  displayName: string | null;
  user: {
    displayName: string | null;
    email: string | null;
  };
};

type InviteItem = {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | Date | null;
  revokedAt?: string | Date | null;
  createdAt: string | Date;
};

type DungeonWorld = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  setting: string | null;
  isPublic: boolean;
  maxMembers: number;
  lastActivityAt: string | Date;
  ownerId: string;
  ownerName: string;
  plan: string;
  messageCount: number;
  memberCount: number;
};

function memberName(member: WorldMember) {
  return (
    member.displayName ||
    member.user.displayName ||
    member.user.email?.split("@")[0] ||
    "Player"
  );
}

function authorName(message: RoomMessage) {
  if (message.role === "NARRATOR") return "Narrator";
  if (message.role === "SYSTEM") return "System";
  return (
    message.authorUser?.displayName ||
    message.authorUser?.email?.split("@")[0] ||
    "Player"
  );
}

function roleClasses(role: RoomMessageRole) {
  if (role === "NARRATOR") {
    return "border-emerald-500/30 bg-emerald-950/35 text-emerald-50 shadow-[0_0_28px_rgba(16,185,129,0.08)]";
  }
  if (role === "SYSTEM") {
    return "border-zinc-700/70 bg-zinc-900/80 text-zinc-300";
  }
  return "border-blue-900/50 bg-black/80 text-zinc-100";
}

function quickActionText(label: string) {
  const templates: Record<string, string> = {
    Explore: "I look around carefully and search for anything unusual.",
    Talk: "I speak up and try to learn what is really going on here.",
    Inspect: "I inspect the nearest clue, object, or detail more closely.",
    Fight: "I ready myself for danger and prepare to act.",
  };
  return templates[label] ?? label;
}

export function DungeonEngineClient({
  world,
  members,
  initialMessages,
  canPost,
  canManageRoles,
  isHost,
  meUserId,
  initialInvites,
}: {
  world: DungeonWorld;
  members: WorldMember[];
  initialMessages: RoomMessage[];
  canPost: boolean;
  canManageRoles: boolean;
  isHost: boolean;
  meUserId: string;
  initialInvites: InviteItem[];
}) {
  const [messages, setMessages] = useState<RoomMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [narrating, setNarrating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/worlds/${world.id}/messages?limit=120`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data?.messages)) return;
      setMessages(data.messages);
    }, 3000);

    return () => clearInterval(id);
  }, [world.id]);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
  }, [messages.length]);

  const latestNarrator = useMemo(
    () => [...messages].reverse().find((message) => message.role === "NARRATOR"),
    [messages],
  );

  const turnCount = messages.filter((message) => message.role !== "SYSTEM").length;

  async function sendMessage(e?: FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (sending || narrating || !canPost) return;

    const content = input.trim();
    if (!content) return;

    setSending(true);
    setError(null);
    const res = await fetch(`/api/worlds/${world.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setSending(false);
      setError(data?.error || "Failed to send turn.");
      return;
    }

    setInput("");
    setMessages((prev) => [...prev, data.message as RoomMessage]);
    setSending(false);
  }

  async function generateNarratorTurn() {
    if (narrating || sending || !canPost) return;

    setNarrating(true);
    setError(null);

    const res = await fetch(`/api/worlds/${world.id}/narrator`, {
      method: "POST",
      headers: { "content-type": "application/json" },
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setNarrating(false);
      setError(data?.error || "Failed to generate narrator turn.");
      return;
    }

    setMessages((prev) => [...prev, data.message as RoomMessage]);
    setNarrating(false);
  }

  function applyQuickAction(label: string) {
    setInput((current) => {
      const next = quickActionText(label);
      return current.trim() ? `${current.trim()}\n${next}` : next;
    });
  }

  return (
    <section className="overflow-hidden rounded-lg border border-blue-900/50 bg-[#05040b] text-zinc-100 shadow-[0_0_55px_rgba(0,69,124,0.18)]">
      <div className="border-b border-blue-900/40 bg-[linear-gradient(360deg,#17023e_50%,#0f2b7d_83%,#0b1d82_100%)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Dungeon Engine
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {world.name}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-50/80">
              {world.summary}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:grid-cols-2">
            <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2.5 text-blue-50">
              {world.isPublic ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {world.isPublic ? "Public" : "Private"}
            </span>
            <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2.5 text-blue-50">
              <Users className="h-3.5 w-3.5" />
              {world.memberCount}/{world.maxMembers}
            </span>
            <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2.5 text-blue-50">
              <ScrollText className="h-3.5 w-3.5" />
              {turnCount} turns
            </span>
            <span className="inline-flex h-9 items-center gap-1 rounded-lg border border-white/15 bg-black/30 px-2.5 text-blue-50">
              <Shield className="h-3.5 w-3.5" />
              {world.plan}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 p-4 sm:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="rounded-lg border border-blue-900/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <BookOpen className="h-4 w-4" />
                Scene
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-blue-50/85">
                {world.setting || "The world is waiting for the first scene to be written."}
              </p>
            </div>

            <div className="rounded-lg border border-emerald-900/50 bg-emerald-950/25 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-100">
                <MessageSquare className="h-4 w-4" />
                Narrator state
              </div>
              <p className="mt-2 line-clamp-5 text-sm leading-6 text-emerald-50/80">
                {latestNarrator?.content || "No narrator turn yet. Press Narrator turn to open the scene."}
              </p>
            </div>
          </div>

          <div
            ref={listRef}
            className="h-[58vh] min-h-[420px] space-y-3 overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950/80 p-3"
          >
            {messages.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-800 bg-black p-6 text-sm text-zinc-500">
                No turns yet. Start with a player action or ask the narrator to frame the opening.
              </div>
            ) : null}

            {messages.map((message) => {
              const isNarrator = message.role === "NARRATOR";
              return (
                <article
                  key={message.id}
                  className={`rounded-lg border p-3 ${roleClasses(message.role)}`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                    <span className="inline-flex items-center gap-2 font-semibold">
                      {isNarrator ? <Sparkles className="h-3.5 w-3.5" /> : null}
                      {authorName(message)}
                    </span>
                    <span className="text-zinc-500">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                </article>
              );
            })}
          </div>

          {canPost ? (
            <form onSubmit={sendMessage} className="space-y-3 rounded-lg border border-zinc-800 bg-black/80 p-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Explore", icon: Dice5 },
                  { label: "Talk", icon: MessageSquare },
                  { label: "Inspect", icon: BookOpen },
                  { label: "Fight", icon: Swords },
                ].map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => applyQuickAction(label)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-xs font-semibold text-zinc-300 transition hover:border-cyan-400/60 hover:text-white"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                maxLength={2500}
                rows={5}
                placeholder="Write your turn, action, dialogue, or intent..."
                className="min-h-[130px] w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/30"
              />

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={sending || narrating || !input.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? "Posting..." : "Post turn"}
                </button>
                <button
                  type="button"
                  onClick={generateNarratorTurn}
                  disabled={sending || narrating}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-emerald-700/70 bg-emerald-950/50 px-4 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {narrating ? "Narrating..." : "Narrator turn"}
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-lg border border-zinc-800 bg-black p-4 text-sm text-zinc-500">
              Join this world to post turns and request narrator responses.
            </div>
          )}
        </div>

        <aside className="space-y-4 border-t border-zinc-800 bg-black/55 p-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:border-l lg:border-t-0">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
              <Users className="h-4 w-4 text-cyan-300" />
              Party
            </h2>
            <div className="mt-3 space-y-2">
              {members.map((member) => {
                const name = memberName(member);
                const isOwnerMember = member.userId === world.ownerId;
                const canEditMemberRole =
                  canManageRoles && member.userId !== meUserId && !isOwnerMember;
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-zinc-200">{name}</span>
                      {member.role === "HOST" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-fuchsia-300">
                          <Crown className="h-3.5 w-3.5" />
                          {isOwnerMember ? "Host (Owner)" : "Co-host"}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">Player</span>
                      )}
                    </div>
                    {canEditMemberRole ? (
                      <WorldMemberRoleControl
                        worldId={world.id}
                        memberUserId={member.userId}
                        role={member.role}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            <div className="font-semibold text-white">World status</div>
            <div className="mt-3 grid gap-2">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Host</span>
                <span className="truncate text-zinc-200">{world.ownerName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Messages</span>
                <span className="text-zinc-200">{world.messageCount}</span>
              </div>
              <div>
                <div className="text-zinc-500">Last activity</div>
                <div className="mt-1 text-zinc-200">
                  {new Date(world.lastActivityAt).toLocaleString()}
                </div>
              </div>
            </div>
          </section>

          <WorldFactionPanel
            worldId={world.id}
            canView={canPost}
            canManage={canManageRoles}
            canAdjust={canPost}
            meUserId={meUserId}
            members={members.map((member) => ({
              userId: member.userId,
              name: memberName(member),
            }))}
          />

          {isHost ? (
            <WorldInviteManager worldId={world.id} initialInvites={initialInvites} />
          ) : null}
        </aside>
      </div>
    </section>
  );
}
