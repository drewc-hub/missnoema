"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Badge,
} from "@/components/ui";
import type { ContentRating } from "@/lib/db";

type MediaGenPanelProps = {
  allowAdult: boolean;
  loggedIn: boolean;
  companionId: string;
  contentRating: ContentRating;
  defaultTag?: string;
  onGenerated?: (url: string, type: "image" | "video") => void;
  onHistoryRefresh?: () => void;
};

type JobStatusResponse = {
  ok: true;
  job: {
    id: string;
    status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | string;
    resultUrl?: string | null;
    error?: string | null;
  };
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function MediaGenPanel({
  allowAdult,
  loggedIn,
  companionId,
  contentRating,
  defaultTag = "",
  onGenerated,
  onHistoryRefresh,
}: MediaGenPanelProps) {
  const [prompt, setPrompt] = useState(
    defaultTag ? `Portrait of ${defaultTag}` : "",
  );
  const [loadingType, setLoadingType] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"image" | "video" | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const activeJobIdRef = useRef<string | null>(null);

  async function fetchBalance() {
    try {
      const res = await fetch("/api/me/balance");
      const data = await res.json().catch(() => null);
      if (res.ok && typeof data?.coinBalance === "number") {
        setCoinBalance(data.coinBalance);
      }
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    if (loggedIn) fetchBalance();
  }, [loggedIn]);

  const canGenerateVideo = contentRating === "ADULT" && allowAdult;
  const isGenerating = loadingType !== null;

  async function pollJob(jobId: string, type: "image" | "video") {
    for (let attempt = 0; attempt < 360; attempt += 1) {
      const res = await fetch(`/api/media/jobs/${encodeURIComponent(jobId)}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null) as JobStatusResponse | { error?: string } | null;

      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error || "Failed to poll job.");
      }

      const job = (data as JobStatusResponse | null)?.job;
      const status = job?.status ?? "UNKNOWN";
      setJobStatus(
        status === "PENDING" ? "Queued…" : status === "RUNNING" ? "Generating…" : status,
      );

      if (status === "SUCCEEDED") {
        if (!job?.resultUrl) throw new Error("Job completed but no result URL.");
        setResultUrl(job.resultUrl);
        setResultType(type);
        onGenerated?.(job.resultUrl, type);
        onHistoryRefresh?.();
        fetchBalance();
        return;
      }

      if (status === "FAILED") {
        throw new Error(job?.error || "Generation failed.");
      }

      await sleep(2000);
    }

    throw new Error("Generation timed out waiting for the worker.");
  }

  async function generate(type: "image" | "video") {
    setError(null);
    setResultUrl(null);
    setResultType(null);
    setLoadingType(type);
    setJobStatus("Queued…");

    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companionId, prompt, type, contentRating }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) throw new Error(data?.error || `Generation failed (${res.status})`);
      if (!data?.jobId) throw new Error("No jobId returned.");

      activeJobIdRef.current = data.jobId;
      await pollJob(data.jobId, type);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      activeJobIdRef.current = null;
      setLoadingType(null);
      setJobStatus(null);
    }
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader
        title="Media generation"
        subtitle="Queue an image or video generation job."
        right={
          <Badge tone={contentRating === "ADULT" ? "adult" : "safe"}>
            {contentRating}
          </Badge>
        }
      />

      <CardBody>
        <div className="space-y-4">
          {/* Coin balance + pricing */}
          <div className="rounded-xl border border-blue-900/60 bg-blue-950/30 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold text-zinc-300">Your balance</div>
              <div className="text-sm font-bold text-white">
                {loggedIn
                  ? coinBalance === null
                    ? "Loading…"
                    : `${coinBalance} coins`
                  : "—"}
              </div>
            </div>
            <div className="border-t border-blue-900/40 pt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <span className="text-zinc-400">Chat message</span>
              <span className="text-right text-emerald-400 font-medium">Free</span>
              <span className="text-zinc-400">HD image</span>
              <span className="text-right text-zinc-200 font-medium">5 coins</span>
              <span className="text-zinc-400">Premium image</span>
              <span className="text-right text-zinc-200 font-medium">10 coins</span>
              <span className="text-zinc-400">Short video</span>
              <span className="text-right text-zinc-200 font-medium">20 coins</span>
              <span className="text-zinc-400">Long HQ video</span>
              <span className="text-right text-zinc-200 font-medium">50 coins</span>
            </div>
          </div>

          {!loggedIn ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
              Log in to generate media.
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Prompt</div>
            <Input
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrompt(e.target.value)}
              placeholder="Portrait, cinematic lighting, soft background..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => generate("image")}
              disabled={!loggedIn || !prompt.trim() || isGenerating}
            >
              {loadingType === "image" ? "Generating…" : "Generate image"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => generate("video")}
              disabled={!loggedIn || !prompt.trim() || !canGenerateVideo || isGenerating}
            >
              {loadingType === "video" ? "Generating…" : "Generate video"}
            </Button>
          </div>

          {!allowAdult && contentRating === "ADULT" ? (
            <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-3 text-sm text-amber-200">
              Adult generation requires age verification.
            </div>
          ) : null}

          {jobStatus ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-200">Status</div>
                  <div className="text-xs text-zinc-400">{jobStatus}</div>
                </div>
                {isGenerating ? (
                  <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                ) : null}
              </div>
            </div>
          ) : null}

          {isGenerating && !resultUrl ? (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="aspect-[4/3] w-full animate-pulse bg-zinc-900" />
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {resultUrl ? (
            <div className="space-y-2">
              <div className="text-xs text-zinc-400">Latest result</div>
              {resultType === "video" ? (
                <video controls className="w-full rounded-2xl border border-zinc-800">
                  <source src={resultUrl} />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resultUrl}
                  alt="Generated media"
                  className="w-full rounded-2xl border border-zinc-800 object-cover"
                />
              )}
            </div>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
