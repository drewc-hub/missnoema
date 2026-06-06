"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Swords } from "lucide-react";

type Props = {
  companionSlug?: string;
  campaignId?: string;
  title?: string;
  genre?: string;
  tone?: string;
  children?: ReactNode;
  className?: string;
  onSuccess?: (campaignId: string) => void;
};

export default function CreateRpCampaignButton({
  companionSlug,
  campaignId,
  title,
  genre,
  tone,
  children = "Start Story Mode",
  className = "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60",
  onSuccess,
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createCampaign() {
    if (pending) return;
    setPending(true);
    setSucceeded(false);
    setError(null);

    try {
      const res = await fetch("/api/rp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          companionSlug,
          campaignId,
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

      onSuccess?.(data.campaignId);
      if (campaignId) {
        setSucceeded(true);
        setPending(false);
        router.refresh();
      } else {
        router.push(`/rp/${data.campaignId}`);
      }
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Failed to update campaign");
      setPending(false);
    }
  }

  return (
    <div className="min-w-0">
      <button
        type="button"
        onClick={createCampaign}
        disabled={pending || succeeded}
        className={className}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Swords className="h-4 w-4" />
        )}
        {pending
          ? campaignId
            ? "Adding..."
            : "Creating..."
          : succeeded
            ? "Added"
            : children}
      </button>
      {error ? (
        <p className="mt-2 text-xs leading-5 text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
