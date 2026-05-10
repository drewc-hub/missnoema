"use client";

import { useEffect, useState } from "react";

async function fetchEmail(signal: AbortSignal): Promise<string | null> {
  const res = await fetch("/api/debug/whoami", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
  });
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return (data?.user?.email ?? data?.email ?? null) as string | null;
}

export default function UserBadge() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    fetchEmail(ac.signal)
      .then(setEmail)
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  if (loading) return <span className="text-xs text-zinc-500">…</span>;

  if (!email) {
    return (
      <div className="flex items-center gap-2">
        <a
          href="/login"
          className="inline-flex items-center rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500 hover:text-white"
        >
          Log in
        </a>
        <a
          href="/signup"
          className="inline-flex items-center rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
        >
          Sign up
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <a
        href="/account/billing"
        className="inline-flex items-center rounded-2xl bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
      >
        Subscribe
      </a>
      <span className="text-xs text-zinc-400 hidden sm:inline">
        <span className="text-zinc-200">{email}</span>
      </span>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="inline-flex items-center rounded-2xl border border-zinc-700 bg-zinc-900/70 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500 hover:text-white"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
