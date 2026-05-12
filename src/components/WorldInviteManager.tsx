"use client";

import { useState } from "react";

type InviteItem = {
  id: string;
  code: string;
  maxUses: number;
  usedCount: number;
  expiresAt: string | Date | null;
  revokedAt?: string | Date | null;
  createdAt: string | Date;
};

export function WorldInviteManager({
  worldId,
  initialInvites,
}: {
  worldId: string;
  initialInvites: InviteItem[];
}) {
  const [invites, setInvites] = useState<InviteItem[]>(initialInvites);
  const [maxUses, setMaxUses] = useState(25);
  const [expiresHours, setExpiresHours] = useState(72);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [linkCopiedCode, setLinkCopiedCode] = useState<string | null>(null);

  async function createInvite(options?: { forceSingleUse?: boolean }) {
    if (creating) return;
    setCreating(true);
    setError(null);

    const payload = options?.forceSingleUse
      ? { maxUses: 1, expiresHours }
      : { maxUses, expiresHours };

    const res = await fetch(`/api/worlds/${worldId}/invites`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setCreating(false);
      setError(data?.error || "Could not create invite.");
      return;
    }

    setInvites((prev) => [data.invite, ...prev]);
    setCreating(false);
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 1500);
  }

  async function copyDirectLink(code: string) {
    const link = `${window.location.origin}/worlds/join?code=${encodeURIComponent(code)}`;
    await navigator.clipboard.writeText(link);
    setLinkCopiedCode(code);
    setTimeout(
      () => setLinkCopiedCode((current) => (current === code ? null : current)),
      1500,
    );
  }

  return (
    <section className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-sm font-semibold text-white">Invite codes</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          createInvite();
        }}
        className="grid gap-2 sm:grid-cols-[120px_120px_1fr]"
      >
        <input
          type="number"
          min={1}
          max={500}
          value={maxUses}
          onChange={(e) => setMaxUses(Math.max(1, Math.min(500, Number(e.target.value) || 25)))}
          className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
          title="Max uses"
        />
        <input
          type="number"
          min={1}
          max={720}
          value={expiresHours}
          onChange={(e) => setExpiresHours(Math.max(1, Math.min(720, Number(e.target.value) || 72)))}
          className="h-10 rounded-lg border border-zinc-800 bg-black px-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
          title="Expires in hours"
        />
        <button
          type="submit"
          disabled={creating}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? "Creating..." : "Create invite"}
        </button>
      </form>
      <button
        type="button"
        onClick={() => createInvite({ forceSingleUse: true })}
        disabled={creating}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {creating ? "Creating..." : "Create single-use invite link"}
      </button>

      {error ? <p className="text-xs text-rose-300">{error}</p> : null}

      <div className="space-y-2">
        {invites.length > 0 ? (
          invites.map((invite) => (
            <div
              key={invite.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-xs"
            >
              <div className="flex flex-col">
                <span className="font-mono text-sm text-zinc-100">{invite.code}</span>
                <span className="text-zinc-500">
                  uses {invite.usedCount}/{invite.maxUses} · expires{" "}
                  {invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "never"}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => copyCode(invite.code)}
                  className="inline-flex h-8 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                >
                  {copiedCode === invite.code ? "Copied" : "Copy code"}
                </button>
                <button
                  type="button"
                  onClick={() => copyDirectLink(invite.code)}
                  className="inline-flex h-8 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-xs font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                >
                  {linkCopiedCode === invite.code ? "Link copied" : "Copy link"}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-500">
            No invites yet.
          </div>
        )}
      </div>
    </section>
  );
}
