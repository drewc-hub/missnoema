"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import CreateRpCampaignButton from "@/components/rp/CreateRpCampaignButton";

type RpStoryListItem = {
  id: string;
  title: string;
  genre?: string | null;
  tone?: string | null;
  status: string;
  updatedAt: string;
  latestScene?: string | null;
  latestEvent?: string | null;
};

type Props = {
  activeCampaignId: string;
  stories: RpStoryListItem[];
};

export default function RpStoryList({ activeCampaignId, stories }: Props) {
  const router = useRouter();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function deleteStory(storyId: string) {
    if (deletingId) return;

    setDeletingId(storyId);
    try {
      const res = await fetch(`/api/rp/${storyId}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete story");
      }

      setConfirmId(null);

      if (storyId === activeCampaignId) {
        const nextStory = stories.find((story) => story.id !== storyId);
        router.push(nextStory ? `/rp/${nextStory.id}` : "/roleplay");
      } else {
        router.refresh();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col rounded-3xl border border-white/10 bg-black/45 p-4 shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-blue-300">
            Stories
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">
            Roleplay campaigns
          </h2>
        </div>
      </div>

      <CreateRpCampaignButton className="mt-4 inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60">
        Start new story
      </CreateRpCampaignButton>

      <div
        className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
        onWheel={(event) => {
          const panel = event.currentTarget;
          const atTop = panel.scrollTop <= 0;
          const atBottom =
            Math.ceil(panel.scrollTop + panel.clientHeight) >= panel.scrollHeight;
          if (
            (event.deltaY < 0 && atTop) ||
            (event.deltaY > 0 && atBottom)
          ) {
            event.preventDefault();
            window.scrollBy({ top: event.deltaY, behavior: "auto" });
          }
        }}
      >
        {stories.length > 0 ? (
          stories.map((story) => {
            const active = story.id === activeCampaignId;
            const confirming = confirmId === story.id;
            const deleting = deletingId === story.id;
            const updatedAt = new Date(story.updatedAt);

            return (
              <div
                key={story.id}
                className={
                  active
                    ? "rounded-2xl border border-blue-400/50 bg-blue-500/15 text-white"
                    : "rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:border-blue-400/40 hover:bg-white/[0.07] hover:text-white"
                }
              >
                <div className="flex gap-2 p-3">
                  <a href={`/rp/${story.id}`} className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-sm font-semibold">
                      {story.title}
                    </div>
                    {story.latestScene ? (
                      <div className="mt-1 line-clamp-1 text-xs text-blue-200/80">
                        {story.latestScene}
                      </div>
                    ) : null}
                    {story.latestEvent ? (
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                        {story.latestEvent}
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {story.genre ? (
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                          {story.genre}
                        </span>
                      ) : null}
                      {story.tone ? (
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-400">
                          {story.tone}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-[11px] text-slate-500">
                      Last used{" "}
                      {updatedAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                      {" at "}
                      {updatedAt.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                  </a>
                  <button
                    type="button"
                    aria-label={`Delete ${story.title}`}
                    onClick={() => setConfirmId(story.id)}
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 text-slate-500 transition hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-200"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {confirming ? (
                  <div className="border-t border-white/10 p-3">
                    <div className="text-xs font-medium text-red-100">
                      Are you sure?
                    </div>
                    <div className="mt-1 text-[11px] leading-4 text-slate-500">
                      This deletes the story, messages, scenes, and cast links.
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => deleteStory(story.id)}
                        disabled={deleting}
                        className="inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-lg bg-red-500 px-3 text-xs font-semibold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={deleting}
                        className="h-8 flex-1 rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-slate-400">
            Start your first saved roleplay story.
          </div>
        )}
      </div>
    </section>
  );
}
