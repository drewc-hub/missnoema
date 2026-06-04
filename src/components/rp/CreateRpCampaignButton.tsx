"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Swords } from "lucide-react";

type Props = {
  companionSlug?: string;
  title?: string;
  genre?: string;
  tone?: string;
  children?: ReactNode;
  className?: string;
};

export default function CreateRpCampaignButton({
  companionSlug,
  title,
  genre,
  tone,
  children = "Start Story Mode",
  className = "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60",
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function createCampaign() {
    if (pending) return;
    setPending(true);

    try {
      const res = await fetch("/api/rp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companionSlug,
          title,
          genre,
          tone,
        }),
      });

      if (res.status === 401) {
        router.push(`/login?next=${encodeURIComponent("/roleplay")}`);
        return;
      }

      const data = (await res.json()) as {
        campaignId?: string;
        error?: string;
      };

      if (!res.ok || !data.campaignId) {
        throw new Error(data.error || "Failed to create campaign");
      }

      router.push(`/rp/${data.campaignId}`);
    } catch (error) {
      console.error(error);
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={createCampaign}
      disabled={pending}
      className={className}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Swords className="h-4 w-4" />
      )}
      {pending ? "Creating..." : children}
    </button>
  );
}
