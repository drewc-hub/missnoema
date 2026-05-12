"use client";

import { useEffect, useMemo, useState } from "react";
import { Shield, Star, Swords } from "lucide-react";

type MemberOption = {
  userId: string;
  name: string;
};

type FactionItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  metadata?: unknown;
  _count?: {
    reputations?: number;
  };
};

type ReputationItem = {
  reputation: number;
  level: number;
  metadata?: unknown;
  lastUpdatedAt?: string | null;
};

type RepHistoryEntry = {
  at: string;
  delta: number;
  from: number;
  to: number;
  reason: string;
  updatedByUserId?: string;
};

function repTone(reputation: number) {
  if (reputation >= 75) return "text-emerald-300";
  if (reputation >= 50) return "text-sky-300";
  if (reputation >= 25) return "text-amber-300";
  return "text-rose-300";
}

function readHistory(metadata: unknown): RepHistoryEntry[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as Record<string, unknown>).history;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map((entry) => ({
      at: typeof entry.at === "string" ? entry.at : "",
      delta: typeof entry.delta === "number" ? Math.round(entry.delta) : 0,
      from: typeof entry.from === "number" ? Math.round(entry.from) : 0,
      to: typeof entry.to === "number" ? Math.round(entry.to) : 0,
      reason: typeof entry.reason === "string" ? entry.reason : "update",
      updatedByUserId:
        typeof entry.updatedByUserId === "string" ? entry.updatedByUserId : undefined,
    }))
    .filter((entry) => entry.at);
}

export function WorldFactionPanel({
  worldId,
  canView,
  canManage,
  canAdjust,
  members,
  meUserId,
}: {
  worldId: string;
  canView: boolean;
  canManage: boolean;
  canAdjust: boolean;
  members: MemberOption[];
  meUserId: string;
}) {
  const [factions, setFactions] = useState<FactionItem[]>([]);
  const [reputationByFaction, setReputationByFaction] = useState<Record<string, ReputationItem>>({});
  const [loading, setLoading] = useState(canView);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedFactionId, setSelectedFactionId] = useState("");
  const [delta, setDelta] = useState(5);
  const [targetUserId, setTargetUserId] = useState(meUserId);
  const [adjusting, setAdjusting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!canView) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/worlds/${worldId}/factions`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (!cancelled) {
          setError(data?.error || "Could not load factions.");
          setLoading(false);
        }
        return;
      }

      const nextFactions = Array.isArray(data?.factions) ? (data.factions as FactionItem[]) : [];
      if (cancelled) return;
      setFactions(nextFactions);
      if (!selectedFactionId && nextFactions.length > 0) {
        setSelectedFactionId(nextFactions[0].id);
      }

      const repEntries = await Promise.all(
        nextFactions.map(async (faction) => {
          const repRes = await fetch(
            `/api/worlds/${worldId}/factions/${faction.id}/reputation`,
            { cache: "no-store" },
          );
          const repData = await repRes.json().catch(() => null);
          if (!repRes.ok || !repData?.reputation) return [faction.id, null] as const;
          return [faction.id, repData.reputation as ReputationItem] as const;
        }),
      );

      if (cancelled) return;
      setReputationByFaction(
        Object.fromEntries(repEntries.filter((row): row is readonly [string, ReputationItem] => !!row[1])),
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [worldId, canView]);

  const selectedFaction = useMemo(
    () => factions.find((faction) => faction.id === selectedFactionId) ?? null,
    [factions, selectedFactionId],
  );
  const memberNameById = useMemo(
    () =>
      new Map(
        members.map((member) => [member.userId, member.name] as const),
      ),
    [members],
  );
  const selectedReputation = selectedFaction ? reputationByFaction[selectedFaction.id] : undefined;
  const selectedHistory = useMemo(
    () => readHistory(selectedReputation?.metadata).slice(0, 4),
    [selectedReputation],
  );

  async function createFaction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canManage || creating) return;
    setCreating(true);
    setError(null);
    setStatus(null);

    const res = await fetch(`/api/worlds/${worldId}/factions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Could not create faction.");
      setCreating(false);
      return;
    }

    const faction = data?.faction as FactionItem | undefined;
    if (faction) {
      setFactions((current) => [faction, ...current]);
      setSelectedFactionId(faction.id);
    }
    setName("");
    setSlug("");
    setDescription("");
    setCreating(false);
    setStatus("Faction created.");
  }

  async function adjustReputation() {
    if (!selectedFactionId || adjusting || !canAdjust) return;
    setAdjusting(true);
    setError(null);
    setStatus(null);

    const res = await fetch(`/api/worlds/${worldId}/factions/${selectedFactionId}/reputation`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId: targetUserId,
        delta,
        reason: "world_panel_adjustment",
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.error || "Could not update reputation.");
      setAdjusting(false);
      return;
    }

    setStatus("Reputation updated.");
    const next = data?.reputation as ReputationItem | undefined;
    if (next) {
      setReputationByFaction((current) => ({
        ...current,
        [selectedFactionId]: next,
      }));
    }
    setAdjusting(false);
  }

  if (!canView) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
        Join this world to view faction standings.
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
        <Shield className="h-4 w-4 text-fuchsia-300" />
        Factions
      </h2>

      {loading ? (
        <div className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-500">
          Loading factions...
        </div>
      ) : null}

      {!loading && factions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-800 bg-black px-3 py-2 text-xs text-zinc-500">
          No factions yet.
        </div>
      ) : null}

      <div className="space-y-2">
        {factions.map((faction) => {
          const rep = reputationByFaction[faction.id];
          return (
            <button
              key={faction.id}
              type="button"
              onClick={() => setSelectedFactionId(faction.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                selectedFactionId === faction.id
                  ? "border-fuchsia-500/60 bg-fuchsia-500/10"
                  : "border-zinc-800 bg-black hover:border-fuchsia-500/40"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-zinc-100">{faction.name}</span>
                {rep ? (
                  <span className={`text-xs font-semibold ${repTone(rep.reputation)}`}>
                    {rep.reputation} rep
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">No standing</span>
                )}
              </div>
              {faction.description ? (
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">{faction.description}</p>
              ) : null}
            </button>
          );
        })}
      </div>

      {selectedFaction ? (
        <div className="rounded-lg border border-zinc-800 bg-black p-3 text-xs">
          <div className="text-zinc-400">{selectedFaction.slug}</div>
          <div className="mt-1 flex items-center gap-2">
            <Star className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-zinc-200">
              Level {selectedReputation?.level ?? 3}
            </span>
          </div>
          <div className={`mt-1 font-semibold ${repTone(selectedReputation?.reputation ?? 50)}`}>
            Reputation {selectedReputation?.reputation ?? 50}
          </div>
          {selectedHistory.length > 0 ? (
            <div className="mt-2 space-y-1 border-t border-zinc-800 pt-2 text-[11px] text-zinc-400">
              {selectedHistory.map((entry, idx) => (
                <div key={`${entry.at}-${idx}`} className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate">{entry.reason.replaceAll("_", " ")}</div>
                    <div className="truncate text-[10px] text-zinc-500">
                      by{" "}
                      {entry.updatedByUserId
                        ? (memberNameById.get(entry.updatedByUserId) ?? "Player")
                        : "Player"}{" "}
                      · {new Date(entry.at).toLocaleString()}
                    </div>
                  </div>
                  <span className={`shrink-0 ${entry.delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    {entry.delta >= 0 ? "+" : ""}
                    {entry.delta}
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {canAdjust && selectedFaction ? (
        <div className="space-y-2 rounded-lg border border-zinc-800 bg-black p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <Swords className="h-3.5 w-3.5 text-fuchsia-300" />
            Adjust reputation
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {canManage ? (
              <select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
              >
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.name}
                  </option>
                ))}
              </select>
            ) : null}
            <input
              type="number"
              min={-50}
              max={50}
              value={delta}
              onChange={(e) =>
                setDelta(Math.max(-50, Math.min(50, Number(e.target.value) || 0)))
              }
              className="h-9 rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
            />
            <button
              type="button"
              onClick={adjustReputation}
              disabled={adjusting}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-fuchsia-500/50 bg-fuchsia-500/10 px-3 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20 disabled:opacity-60"
            >
              {adjusting ? "Saving..." : "Apply"}
            </button>
          </div>
        </div>
      ) : null}

      {canManage ? (
        <form onSubmit={createFaction} className="space-y-2 rounded-lg border border-zinc-800 bg-black p-3">
          <div className="text-xs font-semibold text-zinc-200">Create faction</div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            required
            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="slug (optional)"
            className="h-9 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 text-xs text-zinc-100"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            rows={2}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
          />
          <button
            type="submit"
            disabled={creating}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-fuchsia-500 px-3 text-xs font-semibold text-white transition hover:bg-fuchsia-400 disabled:opacity-60"
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </form>
      ) : null}

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {status ? <p className="text-xs text-emerald-300">{status}</p> : null}
    </section>
  );
}
