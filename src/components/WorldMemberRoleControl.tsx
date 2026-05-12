"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function WorldMemberRoleControl({
  worldId,
  memberUserId,
  role,
}: {
  worldId: string;
  memberUserId: string;
  role: "HOST" | "PLAYER";
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextRole = role === "HOST" ? "PLAYER" : "HOST";
  const label = role === "HOST" ? "Demote" : "Promote";

  async function updateRole() {
    if (pending) return;
    setPending(true);
    setError(null);

    const res = await fetch(`/api/worlds/${worldId}/members/${memberUserId}/role`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: nextRole }),
    });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      setPending(false);
      setError(data?.error || "Role update failed.");
      return;
    }

    setPending(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={updateRole}
        disabled={pending}
        className="inline-flex h-7 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 text-[11px] font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Saving..." : label}
      </button>
      {error ? <span className="max-w-[120px] text-right text-[10px] text-rose-300">{error}</span> : null}
    </div>
  );
}
