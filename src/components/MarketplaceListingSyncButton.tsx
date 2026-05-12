"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RefreshCw } from "lucide-react";

export function MarketplaceListingSyncButton({ companionId }: { companionId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  async function syncListing() {
    setStatus("syncing");

    const response = await fetch("/api/marketplace/listings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ companionId }),
    });

    if (!response.ok) {
      setStatus("error");
      return;
    }

    setStatus("synced");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={syncListing}
      disabled={status === "syncing"}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${status === "syncing" ? "animate-spin" : ""}`} />
      {status === "syncing"
        ? "Syncing"
        : status === "synced"
          ? "Synced"
          : status === "error"
            ? "Try again"
            : "Sync listing"}
    </button>
  );
}
