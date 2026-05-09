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
          className="inline-flex items-center rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-white"
        >
          Log in
        </a>
        <a
          href="/signup"
          className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
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
        className="inline-flex items-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-200"
      >
        Subscribe
      </a>
      <span className="text-xs text-zinc-400 hidden sm:inline">
        Logged in as <span className="text-zinc-200">{email}</span>
      </span>
      <form action="/api/auth/logout" method="POST">
        <button
          type="submit"
          className="inline-flex items-center rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900 hover:text-white"
        >
          Logout
        </button>
      </form>
    </div>
  );
}
