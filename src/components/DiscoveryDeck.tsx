"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, MessageCircle, RotateCcw, Sparkles, X } from "lucide-react";

type DiscoveryCompanion = {
    id: string;
    slug: string;
    name: string;
    description: string;
    tags: string[];
    thumbnailUrl: string | null;
    saved: boolean;
    contentRating?: "SAFE" | "ADULT";
};

async function recordReaction(
    companionId: string,
    action: "impression" | "pass" | "save" | "start",
) {
    await fetch("/api/discovery/react", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companionId, action }),
    });
}

export function DiscoveryDeck({
    initialCompanions,
    signedIn,
    mode = "discovery",
    includeAdult = false,
}: {
    initialCompanions: DiscoveryCompanion[];
    signedIn: boolean;
    mode?: "discovery" | "matchmaking";
    includeAdult?: boolean;
}) {
    const [companions, setCompanions] = useState(initialCompanions);
    const [index, setIndex] = useState(0);
    const [savedIds, setSavedIds] = useState(
        () => new Set(initialCompanions.filter((c) => c.saved).map((c) => c.id)),
    );
    const [status, setStatus] = useState<string | null>(null);
    const [loadingMore, setLoadingMore] = useState(false);
    const impressedIds = useRef(new Set<string>());

    const active = companions[index] ?? null;
    const remaining = Math.max(0, companions.length - index - 1);

    const nextPreview = useMemo(
        () => companions.slice(index + 1, index + 4),
        [companions, index],
    );

    useEffect(() => {
        if (!active || !signedIn || impressedIds.current.has(active.id)) return;
        impressedIds.current.add(active.id);
        recordReaction(active.id, "impression").catch(() => undefined);
    }, [active, signedIn]);

    function advance() {
        setIndex((current) => Math.min(current + 1, companions.length));
    }

    async function handlePass() {
        if (!active) return;
        setStatus(null);
        advance();
        if (signedIn) {
            recordReaction(active.id, "pass").catch(() => undefined);
        }
    }

    async function handleSave() {
        if (!active) return;
        setSavedIds((current) => new Set(current).add(active.id));
        setStatus("Saved");
        if (signedIn) {
            recordReaction(active.id, "save").catch(() => setStatus("Save failed"));
        } else {
            setStatus("Login required to save");
        }
    }

    async function handleChat() {
        if (!active) return;
        if (signedIn) {
            await recordReaction(active.id, "start").catch(() => undefined);
        }
        window.location.href = `/chat?companion=${encodeURIComponent(active.slug)}`;
    }

    function resetDeck() {
        setIndex(0);
        setStatus(null);
        setCompanions(initialCompanions);
    }

    async function loadMore() {
        if (loadingMore) return;
        setLoadingMore(true);
        setStatus(null);

        try {
            const exclude = companions.map((companion) => companion.id).join(",");
            const query = new URLSearchParams({
                limit: "20",
                exclude,
                mode,
            });
            if (includeAdult) {
                query.set("includeAdult", "1");
            }
            const res = await fetch(
                `/api/discovery/next?${query.toString()}`,
            );
            const data = await res.json().catch(() => null);
            const nextItems = Array.isArray(data?.items)
                ? (data.items as DiscoveryCompanion[])
                : [];

            if (!res.ok) {
                setStatus(data?.error || "Could not load more companions.");
                return;
            }

            if (nextItems.length === 0) {
                setStatus("No fresh companions found right now.");
                return;
            }

            setCompanions((current) => {
                const currentIds = new Set(current.map((companion) => companion.id));
                const uniqueNext = nextItems.filter((companion) => !currentIds.has(companion.id));
                return [...current, ...uniqueNext];
            });
        } finally {
            setLoadingMore(false);
        }
    }

    if (!active) {
        return (
            <div className="rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)] p-8 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200">
                    <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="mt-5 text-2xl font-semibold text-white">Discovery complete</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                    You reached the end of this deck. Load fresh companions, reset the current
                    stack, or browse the full library.
                </p>
                {status ? <div className="mt-4 text-sm text-fuchsia-200">{status}</div> : null}
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                    <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:opacity-50"
                    >
                        <Sparkles className="h-4 w-4" />
                        {loadingMore ? "Loading" : "Load More"}
                    </button>
                    <button
                        type="button"
                        onClick={resetDeck}
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reset Deck
                    </button>
                    <a
                        href="/discover/saved"
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-4 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20"
                    >
                        <Bookmark className="h-4 w-4" />
                        Saved
                    </a>
                    <a
                        href="/companions"
                        className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                    >
                        Browse Library
                    </a>
                </div>
            </div>
        );
    }

    const isSaved = savedIds.has(active.id);

    return (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
                <div className="grid min-h-[620px] lg:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.55fr)]">
                    <div className="relative min-h-[420px] bg-zinc-950">
                        {active.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={active.thumbnailUrl}
                                alt={`${active.name} portrait`}
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex h-full min-h-[420px] items-center justify-center text-7xl font-semibold text-zinc-800">
                                {active.name.slice(0, 1)}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30" />
                        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                            <div className="rounded-full border border-zinc-700 bg-black/70 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
                                {remaining} left
                            </div>
                            {isSaved ? (
                                <div className="rounded-full border border-fuchsia-500/40 bg-fuchsia-500/20 px-3 py-1 text-xs font-medium text-fuchsia-100 backdrop-blur">
                                    Saved
                                </div>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex flex-col justify-between p-5 sm:p-7">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
                                <Sparkles className="h-3.5 w-3.5" />
                                Discovery
                            </div>
                            <h1 className="mt-5 text-4xl font-black tracking-tight text-white">
                                {active.name}
                            </h1>
                            <p className="mt-4 text-base leading-7 text-zinc-300">{active.description}</p>

                            <div className="mt-5 flex flex-wrap gap-2">
                                {active.tags.slice(0, 8).map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            {status ? <div className="mt-4 text-sm text-fuchsia-200">{status}</div> : null}
                        </div>

                        <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                            <button
                                type="button"
                                onClick={handlePass}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                                Pass
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 text-sm font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20"
                            >
                                <Bookmark className="h-4 w-4" />
                                Save
                            </button>
                            <button
                                type="button"
                                onClick={handleChat}
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                            >
                                <MessageCircle className="h-4 w-4" />
                                Chat
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <aside className="space-y-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                    <h2 className="text-lg font-semibold text-white">Up next</h2>
                    <div className="mt-4 space-y-3">
                        {nextPreview.length > 0 ? (
                            nextPreview.map((companion) => (
                                <div key={companion.id} className="flex gap-3 rounded-lg border border-zinc-800 bg-black p-2">
                                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-zinc-900">
                                        {companion.thumbnailUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={companion.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                                        ) : null}
                                    </div>
                                    <div className="min-w-0 py-1">
                                        <div className="truncate text-sm font-semibold text-white">{companion.name}</div>
                                        <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500">
                                            {companion.description}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-lg border border-dashed border-zinc-800 bg-black p-4 text-sm text-zinc-500">
                                No more previews in this deck.
                            </div>
                        )}
                    </div>
                </div>

                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-400">
                    This deck uses discovery events to skip recent passes and chats for
                    signed-in users while keeping saved companions available elsewhere.
                </div>
            </aside>
        </div>
    );
}
