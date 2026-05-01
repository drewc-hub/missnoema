// file: src/components/MediaGenPanel.tsx
"use client";

import React, { useMemo, useRef, useState } from "react";
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
  onGenerated?: (url: string) => void;
  onHistoryRefresh?: () => void;
};

type JobStatusResponse = {
  ok: true;
  job: {
    id: string;
    status: "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | string;
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

  const canGenerateVideo = useMemo(() => {
    return contentRating === "ADULT" && allowAdult;
  }, [contentRating, allowAdult]);

  const isVideoUrl = useMemo(() => {
    return resultUrl ? /\.(mp4|webm|mov)(\?|$)/i.test(resultUrl) : false;
  }, [resultUrl]);

  async function pollJob(jobId: string) {
    for (let attempt = 0; attempt < 120; attempt += 1) {
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
      setJobStatus(status);

      if (status === "SUCCEEDED") {
        if (!data?.job?.resultUrl) {
          throw new Error("Job completed but no result URL was returned.");
        }

        setResultUrl(data.job.resultUrl);
        onGenerated?.(data.job.resultUrl);
        onHistoryRefresh?.();
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
    setJobStatus("QUEUED");

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
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
              Job status: {jobStatus}
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
        </div>
      </CardBody>
    </Card>
  );
}
