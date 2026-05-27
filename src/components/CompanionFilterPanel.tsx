"use client";

import { useState, useEffect, useRef } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";

const CATEGORY_TAGS = [
    { label: "All", value: "" },
    { label: "Fantasy", value: "fantasy" },
    { label: "Romance", value: "romance" },
    { label: "Anime", value: "anime" },
    { label: "Sci-Fi", value: "sci-fi" },
    { label: "Adventure", value: "adventure" },
    { label: "Comedy", value: "comedy" },
    { label: "Mystery", value: "mystery" },
    { label: "Horror", value: "horror" },
    { label: "Slice of Life", value: "slice-of-life" },
    { label: "Historical", value: "historical" },
    { label: "Roleplay", value: "roleplay" },
    { label: "Tsundere", value: "tsundere" },
    { label: "Yandere", value: "yandere" },
];

type Props = {
    basePath: string;
    currentQ: string;
    currentTags: string;
    currentHasPhoto: string;
    activeCount: number;
};

export function CompanionFilterPanel({
    basePath,
    currentQ,
    currentTags,
    currentHasPhoto,
    activeCount,
}: Props) {
    const [open, setOpen] = useState(false);
    const drawerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        function handleKey(e: KeyboardEvent) {
            if (e.key === "Escape") setOpen(false);
        }
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [open]);

    // Prevent body scroll when drawer is open
    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <>
            {/* Filter toggle button */}
            <button
                onClick={() => setOpen(true)}
                className="relative flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
            >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeCount > 0 && (
                    <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white">
                        {activeCount}
                    </span>
                )}
            </button>

            {/* Backdrop */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Drawer */}
            <div
                ref={drawerRef}
                className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-white/[0.08] bg-[#0d0d1a] shadow-2xl transition-transform duration-300 ease-in-out ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
            >
                {/* Drawer header */}
                <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                    <span className="text-sm font-bold text-white">Filter</span>
                    <button
                        onClick={() => setOpen(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] text-white/50 hover:border-white/20 hover:text-white transition"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Drawer body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                    {/* Search */}
                    <form method="get" action={basePath} onSubmit={() => setOpen(false)}>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                            <input
                                name="q"
                                defaultValue={currentQ}
                                placeholder="Search companions..."
                                className="h-9 w-full rounded-full border border-white/[0.10] bg-white/[0.05] pl-8 pr-3 text-xs text-white placeholder-white/30 outline-none focus:border-fuchsia-500/50 transition"
                            />
                        </div>
                        <input type="hidden" name="tags" value={currentTags} />
                        <input type="hidden" name="hasPhoto" value={currentHasPhoto} />
                        <button
                            type="submit"
                            className="mt-2 h-8 w-full rounded-full bg-white/[0.07] text-xs font-medium text-white/60 hover:bg-white/[0.12] hover:text-white transition"
                        >
                            Search
                        </button>
                    </form>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                            Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORY_TAGS.map((cat) => {
                                const isActive = currentTags === cat.value;
                                return (
                                    <a
                                        key={cat.value}
                                        href={`${basePath}?tags=${cat.value}&q=${currentQ}&hasPhoto=${currentHasPhoto}&page=1`}
                                        onClick={() => setOpen(false)}
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
                                            isActive
                                                ? "border border-white/[0.15] bg-white/[0.15] text-white"
                                                : "border border-white/[0.07] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                                        }`}
                                    >
                                        {cat.label}
                                    </a>
                                );
                            })}
                        </div>
                    </div>

                    {/* Has photo toggle */}
                    <div>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                            Show
                        </label>
                        <div className="flex flex-col gap-2">
                            {[
                                { label: "With photo only", value: "1" },
                                { label: "All companions", value: "all" },
                            ].map((opt) => {
                                const isActive = currentHasPhoto === opt.value || (opt.value === "1" && !currentHasPhoto);
                                return (
                                    <a
                                        key={opt.value}
                                        href={`${basePath}?tags=${currentTags}&q=${currentQ}&hasPhoto=${opt.value}&page=1`}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                                            isActive
                                                ? "border-fuchsia-500/40 bg-fuchsia-500/[0.08] text-white"
                                                : "border-white/[0.07] bg-white/[0.03] text-white/50 hover:border-white/[0.12] hover:text-white/80"
                                        }`}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${isActive ? "bg-fuchsia-400" : "bg-white/20"}`} />
                                        {opt.label}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Clear filters footer */}
                {activeCount > 0 && (
                    <div className="border-t border-white/[0.08] px-5 py-4">
                        <a
                            href={basePath}
                            onClick={() => setOpen(false)}
                            className="flex h-9 w-full items-center justify-center rounded-full border border-white/[0.10] text-xs font-medium text-white/50 hover:border-white/20 hover:text-white transition"
                        >
                            Clear all filters
                        </a>
                    </div>
                )}
            </div>
        </>
    );
}
