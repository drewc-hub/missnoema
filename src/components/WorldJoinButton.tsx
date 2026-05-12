"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WorldJoinButton({ worldId }: { worldId: string }) {
  const router = useRouter();
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function joinWorld() {
    if (joining) return;
    setJoining(true);
    setError(null);

    const res = await fetch(`/api/worlds/${worldId}/join`, { method: "POST" });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setJoining(false);
      setError(data?.error || "Could not join world.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={joinWorld}
        disabled={joining}
        className="inline-flex h-10 items-center justify-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {joining ? "Joining..." : "Join world"}
      </button>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </div>
  );
}
