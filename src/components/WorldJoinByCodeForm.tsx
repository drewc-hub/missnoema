"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function WorldJoinByCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (joining) return;
    setJoining(true);
    setError(null);

    const res = await fetch("/api/worlds/join-by-code", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setJoining(false);
      setError(data?.error || "Could not join world.");
      return;
    }

    router.push(`/worlds/${data.world.slug}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <label htmlFor="invite-code" className="block text-sm font-semibold text-white">
        Join with invite code
      </label>
      <div className="flex gap-2">
        <input
          id="invite-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          required
          minLength={6}
          maxLength={24}
          placeholder="ABCD23XZ"
          className="h-10 flex-1 rounded-lg border border-zinc-800 bg-black px-3 text-sm uppercase tracking-wide text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
        />
        <button
          type="submit"
          disabled={joining}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {joining ? "Joining..." : "Join"}
        </button>
      </div>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
    </form>
  );
}
