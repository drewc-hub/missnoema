// FILE: src/components/UserBadge.tsx
"use client";

import { useEffect, useState } from "react";

type WhoAmIResponse =
  | { user?: { email?: string | null } }
  | { email?: string | null }
  | null;

async function fetchEmail(signal: AbortSignal): Promise<string | null> {
  const res = await fetch("/api/debug/whoami", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    signal,
  });

  if (!res.ok) return null;

  const data = (await res.json().catch(() => null)) as WhoAmIResponse;
  // Support either { user: { email } } or { email }
  // @ts-ignore
  return (data?.user?.email ?? data?.email ?? null) as string | null;
}

export default function UserBadge() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setEmail(await fetchEmail(ac.signal));
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, []);

  if (loading) return <div className="text-xs text-zinc-400">…</div>;
  if (!email) return <div className="text-xs text-zinc-400">Not signed in</div>;

  return <div className="text-xs text-zinc-300">{email}</div>;
}
