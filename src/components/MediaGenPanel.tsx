// file: src/components/MediaGenPanel.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Badge,
} from "@/components/ui";
import type { ContentRating } from "@/lib/db";

type MediaHistoryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  contentRating: "SAFE" | "ADULT";
  createdAt: string;
  isFavorite: boolean;
  url: string;
};

type MediaGenPanelProps = {
  allowAdult: boolean;
  loggedIn: boolean;
  companionId: string;
  contentRating: ContentRating;
  defaultTag?: string;
  onGenerated?: (url: string) => void;
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
  const [loadingType, setLoadingType] = useState<"image" | "video" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const activeJobIdRef = useRef<string | null>(null);
  const [history, setHistory] = useState<MediaHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const canGenerateVideo = useMemo(() => {
    return contentRating === "ADULT" && allowAdult;
  }, [contentRating, allowAdult]);

  const isVideoUrl = useMemo(() => {
    return resultUrl ? /\.(mp4|webm|mov)(\?|$)/i.test(resultUrl) : false;
  }, [resultUrl]);

  const isGenerating = loadingType !== null;

  async function loadHistory() {
    try {
      setLoadingHistory(true);
      setError(null);

      const res = await fetch(
        `/api/media/history?companionId=${encodeURIComponent(companionId)}`,
        { cache: "no-store" },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load media history.");
      }

      setHistory(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load media history.",
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  async function pollJob(jobId: string) {
    // Video generation can take up to 10 min; poll for up to 360 × 2 s = 12 min.
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

      const status = data?.job?.status ?? "UNKNOWN";

      const prettyStatus =
        status === "PENDING"
          ? "Queued..."
          : status === "RUNNING"
            ? "Generating..."
            : status;

      setJobStatus(prettyStatus);

      if (status === "SUCCEEDED") {
        if (!data?.job?.resultUrl) {
          throw new Error("Job completed but no result URL was returned.");
        }

        setResultUrl(data.job.resultUrl);
        onGenerated?.(data.job.resultUrl);
        onHistoryRefresh?.();
        await loadHistory();
        return;
      }

      if (status === "FAILED") {
        throw new Error(data?.job?.error || "Generation failed.");
      }

      await sleep(2000);
    }

    throw new Error("Generation timed out while waiting for the worker.");
  }

  async function generate(type: "image" | "video") {
    setError(null);
    setResultUrl(null);
    setLoadingType(type);
    setJobStatus("Queued...");

    try {
      const res = await fetch("/api/media/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          companionId,
          prompt,
          type,
          contentRating,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || `Generation failed (${res.status})`);
      }

      if (!data?.jobId) {
        throw new Error("No jobId returned.");
      }

      activeJobIdRef.current = data.jobId;
      await pollJob(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      activeJobIdRef.current = null;
      setLoadingType(null);
      setJobStatus(null);
    }
  }

  useEffect(() => {
    if (loggedIn && companionId) {
      loadHistory();
    }
  }, [loggedIn, companionId]);

  return (
    <Card className="border-zinc-800 bg-zinc-900/40">
      <CardHeader
        title="Media generation"
        subtitle="Queue an image or video generation job for this companion."
        right={
          <Badge tone={contentRating === "ADULT" ? "adult" : "safe"}>
            {contentRating}
          </Badge>
        }
      />

      <CardBody>
        <div className="space-y-4">
          {!loggedIn ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
              Log in to generate media.
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="text-xs text-zinc-400">Prompt</div>
            <Input
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setPrompt(e.target.value)
              }
              placeholder="Portrait, cinematic lighting, detailed face, soft background..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => generate("image")}
              disabled={!loggedIn || !prompt.trim() || loadingType !== null}
            >
              {loadingType === "image" ? "Queueing image..." : "Generate image"}
            </Button>

            <Button
              type="button"
              variant="secondary"
              onClick={() => generate("video")}
              disabled={
                !loggedIn ||
                !prompt.trim() ||
                !canGenerateVideo ||
                loadingType !== null
              }
            >
              {loadingType === "video" ? "Queueing video..." : "Generate video"}
            </Button>
          </div>

          {jobStatus ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-zinc-200">
                    Generation status
                  </div>
                  <div className="text-xs text-zinc-400">{jobStatus}</div>
                </div>

                {isGenerating ? (
                  <div className="h-3 w-3 rounded-full bg-white animate-pulse" />
                ) : null}
              </div>
            </div>
          ) : null}

          {isGenerating && !resultUrl ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">Preview</div>
              <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                <div className="aspect-[4/3] w-full animate-pulse bg-zinc-900" />
                <div className="space-y-2 p-3">
                  <div className="h-3 w-32 animate-pulse rounded bg-zinc-800" />
                  <div className="h-3 w-24 animate-pulse rounded bg-zinc-800" />
                </div>
              </div>
            </div>
          ) : null}

          {!allowAdult && contentRating === "ADULT" ? (
            <div className="rounded-xl border border-amber-800/50 bg-amber-900/20 p-3 text-sm text-amber-200">
              Adult generation requires age verification.
            </div>
          ) : null}

          {error ? (
            <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {resultUrl ? (
            <div className="space-y-3">
              <div className="text-xs text-zinc-400">
                Latest generated result
              </div>

              {isVideoUrl ? (
                <video
                  controls
                  className="w-full rounded-2xl border border-zinc-800"
                >
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

          <div className="space-y-3">
            <div className="text-xs text-zinc-400">Media history</div>

            {loadingHistory ? (
              <div className="text-sm text-zinc-500">Loading history...</div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-500">
                No media yet.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {history.map((item) => {
                  const itemIsVideo = /\.(mp4|webm|mov)(\?|$)/i.test(item.url);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setResultUrl(item.url);
                        onGenerated?.(item.url);
                      }}
                      className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-left transition hover:border-zinc-600"
                    >
                      <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                        {itemIsVideo ? (
                          <video className="h-full w-full object-cover" muted>
                            <source src={item.url} />
                          </video>
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.url}
                            alt="Media history item"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>

                      <div className="space-y-1 p-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] text-zinc-400">
                            {item.type}
                          </span>
                          <Badge
                            tone={
                              item.contentRating === "ADULT" ? "adult" : "safe"
                            }
                          >
                            {item.contentRating}
                          </Badge>
                        </div>

                        {item.isFavorite ? (
                          <div className="text-[11px] text-amber-300">
                            ★ Favorite
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
