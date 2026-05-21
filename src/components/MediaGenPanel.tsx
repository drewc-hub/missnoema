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
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ assetId: string; publicUrl: string | null } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [settingCover, setSettingCover] = useState(false);
  const [focalPoint, setFocalPoint] = useState<{ x: number; y: number } | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [coverSuccess, setCoverSuccess] = useState(false);

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

  async function handleFocalPointClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!uploadResult) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    setFocalPoint({ x, y });
    await fetch(`/api/media/${uploadResult.assetId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ focalX: x, focalY: y }),
    });
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    setUploadResult(null);
    setCoverSuccess(false);
    setFocalPoint(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("companionId", companionId);
      const res = await fetch("/api/media/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.assetId) throw new Error(data?.error || "Upload failed.");
      setUploadResult({ assetId: data.assetId, publicUrl: data.publicUrl ?? null });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSetCover() {
    if (!uploadResult) return;
    setSettingCover(true);
    setCoverSuccess(false);
    try {
      const res = await fetch(`/api/media/${uploadResult.assetId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isCover: true }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to set cover.");
      setCoverSuccess(true);
      onHistoryRefresh?.();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Failed to set cover.");
    } finally {
      setSettingCover(false);
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
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-zinc-400">Prompt</div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] tabular-nums ${prompt.length > 1500 ? "text-amber-400" : "text-zinc-500"}`}>
                  {prompt.length} / 1500
                </span>
                {prompt.length > 100 && (
                  <button
                    type="button"
                    disabled={enhancing}
                    onClick={async () => {
                      setEnhancing(true);
                      setEnhanceError(null);
                      try {
                        const res = await fetch("/api/media/enhance-prompt", {
                          method: "POST",
                          headers: { "content-type": "application/json" },
                          body: JSON.stringify({ prompt }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok || !data?.enhanced) throw new Error(data?.error || "Enhancement failed.");
                        setPrompt(data.enhanced);
                      } catch (err) {
                        setEnhanceError(err instanceof Error ? err.message : "Enhancement failed.");
                      } finally {
                        setEnhancing(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-fuchsia-500/40 bg-fuchsia-600/10 px-2 py-0.5 text-[11px] font-medium text-fuchsia-300 transition hover:bg-fuchsia-600/20 disabled:opacity-50"
                  >
                    {enhancing ? (
                      <span className="h-2.5 w-2.5 animate-spin rounded-full border border-fuchsia-400 border-t-transparent" />
                    ) : (
                      <svg className="h-2.5 w-2.5" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M8 1l1.5 4.5L14 7l-4.5 1.5L8 13l-1.5-4.5L2 7l4.5-1.5L8 1z"/>
                      </svg>
                    )}
                    {enhancing ? "Enhancing…" : "Enhance"}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
              rows={promptFocused ? 8 : 3}
              placeholder="Portrait, cinematic lighting, soft background..."
              className={`w-full resize-y rounded-xl border bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 transition-[min-height] focus:outline-none focus:ring-2 focus:ring-white/20 ${
                prompt.length > 1500 ? "border-amber-700/60" : "border-zinc-800"
              } ${promptFocused ? "min-h-[210px]" : "min-h-[92px]"}`}
            />
            {enhanceError && (
              <div className="text-[11px] text-red-400">{enhanceError}</div>
            )}
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

          {/* Cover photo upload */}
          {loggedIn && (
            <div className="border-t border-zinc-800 pt-4 space-y-3">
              <div className="text-xs font-semibold text-zinc-300">Cover photo</div>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                    e.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 transition hover:bg-zinc-700 disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="h-3 w-3 animate-spin rounded-full border border-zinc-400 border-t-transparent" />
                  ) : (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {uploading ? "Uploading…" : "Upload image"}
                </button>
                <span className="text-[11px] text-zinc-500">JPG · PNG · WebP · max 10 MB</span>
              </div>

              {uploadError && (
                <div className="text-[11px] text-red-400">{uploadError}</div>
              )}

              {uploadResult && (
                <div className="space-y-2">
                  {uploadResult.publicUrl && (
                    <div className="space-y-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <div
                        className="relative max-h-64 w-full cursor-crosshair overflow-hidden rounded-xl border border-zinc-700"
                        onClick={handleFocalPointClick}
                        title="Click to set the face focus point for card cropping"
                      >
                        <img
                          src={uploadResult.publicUrl}
                          alt="Uploaded cover preview"
                          className="h-full w-full object-cover"
                          style={focalPoint ? { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` } : undefined}
                          draggable={false}
                        />
                        {focalPoint && (
                          <div
                            className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg ring-2 ring-fuchsia-500"
                            style={{ left: `${focalPoint.x}%`, top: `${focalPoint.y}%` }}
                          />
                        )}
                        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center">
                          <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-zinc-300">
                            {focalPoint ? `Focus: ${focalPoint.x}%, ${focalPoint.y}%` : "Click to set face focus"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSetCover}
                      disabled={settingCover || coverSuccess}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-600/10 px-3 py-1.5 text-sm font-medium text-fuchsia-300 transition hover:bg-fuchsia-600/20 disabled:opacity-50"
                    >
                      {settingCover ? (
                        <span className="h-3 w-3 animate-spin rounded-full border border-fuchsia-400 border-t-transparent" />
                      ) : (
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                        </svg>
                      )}
                      {settingCover ? "Setting…" : coverSuccess ? "Cover set!" : "Set as cover photo"}
                    </button>
                    {coverSuccess && (
                      <span className="text-[11px] text-emerald-400">Cover photo updated.</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
