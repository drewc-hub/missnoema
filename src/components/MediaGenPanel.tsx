"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
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
  redirectAfterGenerate?: string;
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

type QuotaInfo = {
  cooldownSeconds: number;
  retryAfterSeconds: number;
  dailyCap: number | null;
  dailyUsed: number;
  dailyRemaining: number | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fmtSeconds(s: number) {
  if (s <= 0) return "0s";
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function MediaGenPanel({
  allowAdult,
  loggedIn,
  companionId,
  contentRating,
  defaultTag = "",
  onGenerated,
  onHistoryRefresh,
  redirectAfterGenerate,
}: MediaGenPanelProps) {
  const [prompt, setPrompt] = useState(
    defaultTag ? `Portrait of ${defaultTag}` : "",
  );
  const [negativePrompt, setNegativePrompt] = useState("");
  const [promptFocused, setPromptFocused] = useState(false);
  const [loadingType, setLoadingType] = useState<"image" | "video" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultType, setResultType] = useState<"image" | "video" | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const activeJobIdRef = useRef<string | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetch("/api/me/balance");
      const data = await res.json().catch(() => null);
      if (res.ok && typeof data?.coinBalance === "number") {
        setCoinBalance(data.coinBalance);
      }
    } catch {
      // non-critical
    }
  }, []);

  const fetchQuota = useCallback(async () => {
    try {
      const res = await fetch("/api/media/generate");
      const data = await res.json().catch(() => null);
      if (res.ok && data) {
        setQuota(data as QuotaInfo);
        const secs = Math.max(0, data.retryAfterSeconds ?? 0);
        setCooldownLeft(secs);
        if (secs > 0) startCooldownTimer(secs);
      }
    } catch {
      // non-critical
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function startCooldownTimer(initialSeconds: number) {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    let remaining = initialSeconds;
    cooldownTimerRef.current = setInterval(() => {
      remaining -= 1;
      setCooldownLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(cooldownTimerRef.current!);
        cooldownTimerRef.current = null;
        fetchQuota();
      }
    }, 1000);
  }

  useEffect(() => {
    if (loggedIn) {
      fetchBalance();
      fetchQuota();
    }
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, [loggedIn, fetchBalance, fetchQuota]);

  const canGenerateVideo = contentRating === "ADULT" && allowAdult;
  const isGenerating = loadingType !== null;
  const isCoolingDown = cooldownLeft > 0;
  const isDailyLimitReached =
    quota?.dailyRemaining !== null && quota?.dailyRemaining !== undefined && quota.dailyRemaining <= 0;

  async function pollJob(jobId: string, type: "image" | "video") {
    for (let attempt = 0; attempt < 360; attempt += 1) {
      const res = await fetch(`/api/media/jobs/${encodeURIComponent(jobId)}`, {
        cache: "no-store",
      });

      const data = (await res.json().catch(() => null)) as
        | JobStatusResponse
        | { error?: string }
        | null;

      if (!res.ok) {
        throw new Error(
          (data as { error?: string } | null)?.error || "Failed to poll job.",
        );
      }

      const job = (data as JobStatusResponse | null)?.job;
      const status = job?.status ?? "UNKNOWN";
      setJobStatus(
        status === "PENDING"
          ? "Queued…"
          : status === "RUNNING"
            ? "Generating…"
            : status,
      );

      if (status === "SUCCEEDED") {
        if (!job?.resultUrl) throw new Error("Job completed but no result URL.");
        setResultUrl(job.resultUrl);
        setResultType(type);
        onGenerated?.(job.resultUrl, type);
        onHistoryRefresh?.();
        fetchBalance();
        if (redirectAfterGenerate) {
          window.location.href = redirectAfterGenerate;
        }
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
        body: JSON.stringify({
          companionId,
          prompt,
          negativePrompt,
          type,
          contentRating,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // Cooldown hit — start timer from server's authoritative value
        if (data?.cooldown && typeof data.retryAfterSeconds === "number") {
          setCooldownLeft(data.retryAfterSeconds);
          startCooldownTimer(data.retryAfterSeconds);
        }
        // Daily cap hit — refresh quota so UI updates
        if (data?.limitReached) {
          fetchQuota();
        }
        throw new Error(data?.error || `Generation failed (${res.status})`);
      }

      // Success — update quota display from response
      if (data?.dailyCap !== undefined) {
        setQuota((prev) =>
          prev
            ? {
                ...prev,
                dailyCap: data.dailyCap,
                dailyUsed: data.dailyUsed ?? prev.dailyUsed,
                dailyRemaining: data.dailyRemaining,
                cooldownSeconds: data.cooldownSeconds ?? prev.cooldownSeconds,
                retryAfterSeconds: data.cooldownSeconds ?? 0,
              }
            : null,
        );
        if (data.cooldownSeconds > 0) {
          setCooldownLeft(data.cooldownSeconds);
          startCooldownTimer(data.cooldownSeconds);
        }
      }

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

  const canGenerate = loggedIn && !!prompt.trim() && !isGenerating && !isCoolingDown && !isDailyLimitReached;

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
                    : `${coinBalance.toLocaleString()} coins`
                  : "—"}
              </div>
            </div>
            <div className="border-t border-blue-900/40 pt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
              <span className="text-zinc-400">Chat message</span>
              <span className="text-right text-emerald-400 font-medium">Free</span>
              <span className="text-zinc-400">HD image</span>
              <span className="text-right text-zinc-200 font-medium">6–16 coins</span>
              <span className="text-zinc-400">Video</span>
              <span className="text-right text-zinc-200 font-medium">15–40 coins</span>
            </div>
            {/* Quota / cooldown status */}
            {loggedIn && quota && (
              <div className="border-t border-blue-900/40 pt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                <span className="text-zinc-400">Generations today</span>
                <span className="text-right text-zinc-200 font-medium">
                  {quota.dailyCap === null
                    ? "Unlimited"
                    : `${quota.dailyUsed} / ${quota.dailyCap}`}
                </span>
                {quota.cooldownSeconds > 0 && (
                  <>
                    <span className="text-zinc-400">Cooldown</span>
                    <span className={`text-right font-medium ${isCoolingDown ? "text-amber-400" : "text-emerald-400"}`}>
                      {isCoolingDown ? fmtSeconds(cooldownLeft) : "Ready"}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {!loggedIn ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
              Log in to generate media.
            </div>
          ) : null}

          {/* Daily limit reached banner */}
          {isDailyLimitReached && (
            <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-3 text-sm text-amber-200">
              Daily generation limit reached ({quota?.dailyCap}/day).{" "}
              <a href="/account/billing" className="underline hover:text-amber-100">
                Upgrade your plan
              </a>{" "}
              for more.
            </div>
          )}

          {/* Cooldown banner */}
          {isCoolingDown && !isDailyLimitReached && (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-900/50 p-3 text-sm text-zinc-300">
              Cooldown: {fmtSeconds(cooldownLeft)} until next generation.{" "}
              <a href="/account/billing" className="text-xs text-zinc-500 underline hover:text-zinc-300">
                Upgrade to reduce cooldown →
              </a>
            </div>
          )}

          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Prompt</div>
            <textarea
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
              rows={promptFocused ? 8 : 3}
              placeholder="Portrait, cinematic lighting, soft background..."
              className={`w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-[min-height] focus:outline-none focus:ring-2 focus:ring-white/20 ${
                promptFocused ? "min-h-[210px]" : "min-h-[92px]"
              }`}
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Negative prompt</div>
            <textarea
              value={negativePrompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNegativePrompt(e.target.value)}
              rows={3}
              placeholder="Things to avoid: extra fingers, bad anatomy, blur, text, watermark..."
              className="min-h-[86px] w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => generate("image")}
              disabled={!canGenerate}
            >
              {loadingType === "image"
                ? "Generating…"
                : isCoolingDown
                  ? `Wait ${fmtSeconds(cooldownLeft)}`
                  : "Generate image"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => generate("video")}
              disabled={!canGenerate || !canGenerateVideo}
            >
              {loadingType === "video"
                ? "Generating…"
                : isCoolingDown
                  ? `Wait ${fmtSeconds(cooldownLeft)}`
                  : "Generate video"}
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
