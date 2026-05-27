"use client";

import { useState, useEffect, useRef } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";

const CATEGORY_TAGS = [
    { label: "Fantasy", value: "fantasy" },
    { label: "Romance", value: "romance" },
    { label: "Anime", value: "anime" },
    { label: "Sci-Fi", value: "sci-fi" },
    { label: "Dominant", value: "dominant" },
    { label: "Submissive", value: "submissive" },
    { label: "Roleplay", value: "roleplay" },
    { label: "Adventure", value: "adventure" },
    { label: "Horror", value: "horror" },
    { label: "Tsundere", value: "tsundere" },
    { label: "Yandere", value: "yandere" },
    { label: "Historical", value: "historical" },
    { label: "Slice of Life", value: "slice-of-life" },
    { label: "Mystery", value: "mystery" },
];

const GENDERS = ["Female", "Male", "Non-Binary", "Trans", "Bisexual", "Lesbian", "Gay", "Androgynous"];

type Props = {
    currentQ: string;
    currentTags: string;
    currentGender: string;
    currentHasPhoto: string;
    currentMinAge: string;
    currentMaxAge: string;
    activeCount: number;
};

export function AdultCompanionFilterPanel({
    currentQ,
    currentTags,
    currentGender,
    currentHasPhoto,
    currentMinAge,
    currentMaxAge,
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

    useEffect(() => {
        document.body.style.overflow = open ? "hidden" : "";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="relative flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
            >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
                {activeCount > 0 && (
                    <span className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                        {activeCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                    onClick={() => setOpen(false)}
                />
            )}

            <div
                ref={drawerRef}
                className={`fixed right-0 top-0 z-50 flex h-full w-72 flex-col border-l border-white/[0.08] bg-[#0d0d1a] shadow-2xl transition-transform duration-300 ease-in-out ${
                    open ? "translate-x-0" : "translate-x-full"
                }`}
            >
                <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
                    <span className="text-sm font-bold text-white">Filter</span>
                    <button
                        onClick={() => setOpen(false)}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.10] text-white/50 hover:border-white/20 hover:text-white transition"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
                    {/* Search */}
                    <form method="get" action="/adult/companions" onSubmit={() => setOpen(false)}>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                            <input
                                name="q"
                                defaultValue={currentQ}
                                placeholder="Search companions..."
                                className="h-9 w-full rounded-full border border-white/[0.10] bg-white/[0.05] pl-8 pr-3 text-xs text-white placeholder-white/30 outline-none focus:border-rose-500/50 transition"
                            />
                        </div>
                        <input type="hidden" name="tags" value={currentTags} />
                        <input type="hidden" name="gender" value={currentGender} />
                        <input type="hidden" name="hasPhoto" value={currentHasPhoto} />
                        <input type="hidden" name="minAge" value={currentMinAge} />
                        <input type="hidden" name="maxAge" value={currentMaxAge} />
                        <button
                            type="submit"
                            className="mt-2 h-8 w-full rounded-full bg-white/[0.07] text-xs font-medium text-white/60 hover:bg-white/[0.12] hover:text-white transition"
                        >
                            Search
                        </button>
                    </form>

                    {/* Gender */}
                    <div>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                            Gender
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href={`/adult/companions?tags=${currentTags}&q=${currentQ}&hasPhoto=${currentHasPhoto}&minAge=${currentMinAge}&maxAge=${currentMaxAge}&page=1`}
                                onClick={() => setOpen(false)}
                                className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                                    !currentGender
                                        ? "border-white/[0.15] bg-white/[0.15] text-white"
                                        : "border-white/[0.07] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                                }`}
                            >
                                All
                            </a>
                            {GENDERS.map((g) => (
                                <a
                                    key={g}
                                    href={`/adult/companions?gender=${g}&tags=${currentTags}&q=${currentQ}&hasPhoto=${currentHasPhoto}&minAge=${currentMinAge}&maxAge=${currentMaxAge}&page=1`}
                                    onClick={() => setOpen(false)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                                        currentGender === g
                                            ? "border-rose-500/40 bg-rose-500/[0.12] text-rose-300"
                                            : "border-white/[0.07] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                                    }`}
                                >
                                    {g}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Category */}
                    <div>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                            Category
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <a
                                href={`/adult/companions?gender=${currentGender}&q=${currentQ}&hasPhoto=${currentHasPhoto}&minAge=${currentMinAge}&maxAge=${currentMaxAge}&page=1`}
                                onClick={() => setOpen(false)}
                                className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                                    !currentTags
                                        ? "border-white/[0.15] bg-white/[0.15] text-white"
                                        : "border-white/[0.07] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                                }`}
                            >
                                All
                            </a>
                            {CATEGORY_TAGS.map((cat) => (
                                <a
                                    key={cat.value}
                                    href={`/adult/companions?tags=${cat.value}&gender=${currentGender}&q=${currentQ}&hasPhoto=${currentHasPhoto}&minAge=${currentMinAge}&maxAge=${currentMaxAge}&page=1`}
                                    onClick={() => setOpen(false)}
                                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                                        currentTags === cat.value
                                            ? "border-white/[0.15] bg-white/[0.15] text-white"
                                            : "border-white/[0.07] bg-white/[0.04] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                                    }`}
                                >
                                    {cat.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Age range */}
                    <form method="get" action="/adult/companions" onSubmit={() => setOpen(false)}>
                        <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
                            Age range
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                name="minAge"
                                type="number"
                                placeholder="18"
                                min={18}
                                defaultValue={currentMinAge}
                                className="h-8 w-full rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 text-xs text-white placeholder-white/30 outline-none focus:border-rose-500/50 transition"
                            />
                            <span className="text-xs text-white/30">–</span>
                            <input
                                name="maxAge"
                                type="number"
                                placeholder="Any"
                                defaultValue={currentMaxAge}
                                className="h-8 w-full rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 text-xs text-white placeholder-white/30 outline-none focus:border-rose-500/50 transition"
                            />
                        </div>
                        <input type="hidden" name="q" value={currentQ} />
                        <input type="hidden" name="tags" value={currentTags} />
                        <input type="hidden" name="gender" value={currentGender} />
                        <input type="hidden" name="hasPhoto" value={currentHasPhoto} />
                        <button
                            type="submit"
                            className="mt-2 h-8 w-full rounded-full bg-white/[0.07] text-xs font-medium text-white/60 hover:bg-white/[0.12] hover:text-white transition"
                        >
                            Apply age filter
                        </button>
                    </form>

                    {/* Show */}
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
                                        href={`/adult/companions?hasPhoto=${opt.value}&tags=${currentTags}&gender=${currentGender}&q=${currentQ}&minAge=${currentMinAge}&maxAge=${currentMaxAge}&page=1`}
                                        onClick={() => setOpen(false)}
                                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                                            isActive
                                                ? "border-rose-500/40 bg-rose-500/[0.08] text-white"
                                                : "border-white/[0.07] bg-white/[0.03] text-white/50 hover:border-white/[0.12] hover:text-white/80"
                                        }`}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${isActive ? "bg-rose-400" : "bg-white/20"}`} />
                                        {opt.label}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {activeCount > 0 && (
                    <div className="border-t border-white/[0.08] px-5 py-4">
                        <a
                            href="/adult/companions"
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
