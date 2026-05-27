// file: src/app/adult/companions/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { listCompanions } from "@/lib/companions";
import { Pagination } from "@/components/Pagination";
import { AdultCompanionFilterPanel } from "@/components/AdultCompanionFilterPanel";
import { MessageSquare } from "lucide-react";

type SearchParams = {
    q?: string;
    tags?: string;
    page?: string;
    gender?: string;
    minAge?: string;
    maxAge?: string;
    hasPhoto?: string;
};

type ApiItem = {
    id: string;
    name: string;
    slug: string;
    description: string;
    tags: string[];
    contentRating: "SAFE" | "ADULT";
    thumbnailUrl: string | null;
    focalX?: number;
    focalY?: number;
    imagesCount?: number;
    videosCount?: number;
    featuredRank?: number | null;
};

const GENDER_PILLS = [
    { label: "All", gender: "", tags: "" },
    { label: "Female", gender: "Female", tags: "" },
    { label: "Male", gender: "Male", tags: "" },
    { label: "Non-Binary", gender: "Non-Binary", tags: "" },
];

const CATEGORY_PILLS = [
    { label: "Fantasy", value: "fantasy" },
    { label: "Romance", value: "romance" },
    { label: "Anime", value: "anime" },
    { label: "Dominant", value: "dominant" },
    { label: "Submissive", value: "submissive" },
    { label: "Roleplay", value: "roleplay" },
    { label: "Sci-Fi", value: "sci-fi" },
    { label: "Horror", value: "horror" },
    { label: "Tsundere", value: "tsundere" },
    { label: "Yandere", value: "yandere" },
    { label: "Historical", value: "historical" },
];

function qs(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== "") p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
}

function CompanionCard({ c }: { c: ApiItem }) {
    const viewHref = `/adult/companions/${encodeURIComponent(c.slug)}`;
    const chatHref = `/adult/chat?companion=${encodeURIComponent(c.slug)}`;

    return (
        <div
            className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d1a] transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50"
            style={{ aspectRatio: "188/330" }}
        >
            <a href={viewHref} className="absolute inset-0 block">
                {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={c.thumbnailUrl}
                        alt={c.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        style={{ objectPosition: `${c.focalX ?? 50}% ${c.focalY ?? 0}%` }}
                        loading="lazy"
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] text-5xl font-black text-white/10 select-none">
                        {c.name[0]}
                    </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/30 to-transparent" />

                {/* top-left badges */}
                <div className="absolute left-2 top-2 flex flex-col gap-1">
                    {c.contentRating === "ADULT" && (
                        <span className="rounded-full bg-rose-600/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                            18+
                        </span>
                    )}
                    {typeof c.featuredRank === "number" && c.featuredRank > 0 && (
                        <span className="rounded-full bg-amber-500/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                            #{c.featuredRank}
                        </span>
                    )}
                </div>

                {/* media counts top-right */}
                {((c.imagesCount ?? 0) > 0 || (c.videosCount ?? 0) > 0) && (
                    <div className="absolute right-2 top-2 flex flex-col gap-1 items-end">
                        {(c.imagesCount ?? 0) > 0 && (
                            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
                                🖼 {c.imagesCount}
                            </span>
                        )}
                        {(c.videosCount ?? 0) > 0 && (
                            <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white/70 backdrop-blur-sm">
                                🎬 {c.videosCount}
                            </span>
                        )}
                    </div>
                )}

                {/* name + tags overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="truncate text-sm font-semibold leading-tight text-white">{c.name}</div>
                    <div className="mt-1 max-h-0 overflow-hidden text-xs leading-relaxed text-white/60 opacity-0 transition-all duration-200 group-hover:max-h-10 group-hover:opacity-100 line-clamp-2">
                        {c.description}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.tags.slice(0, 3).map((t) => (
                            <span
                                key={t}
                                className="rounded-full border border-white/[0.10] bg-black/40 px-2 py-0.5 text-[10px] text-white/60 backdrop-blur-sm"
                            >
                                {t}
                            </span>
                        ))}
                    </div>
                </div>
            </a>

            {/* Chat now button — appears on hover */}
            <div className="absolute bottom-3 left-3 right-3 z-10 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
                <a
                    href={chatHref}
                    className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[20px] bg-white/90 text-xs font-bold text-black transition hover:bg-white"
                >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Chat now
                </a>
            </div>
        </div>
    );
}

export default async function AdultCompanionsPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const sp = await searchParams;

    const user = await getAuthedUser();
    if (!isAdultAllowed(user)) {
        redirect(`/adult/verify?next=${encodeURIComponent("/adult/companions")}`);
    }

    const q = (sp.q ?? "").trim();
    const tags = (sp.tags ?? "").trim();
    const gender = (sp.gender ?? "").trim() || undefined;
    const minAge = sp.minAge ? Number(sp.minAge) : undefined;
    const maxAge = sp.maxAge ? Number(sp.maxAge) : undefined;
    const hasPhoto = sp.hasPhoto === "0" ? false : sp.hasPhoto === "all" ? undefined : true;
    const hasPhotoParam = sp.hasPhoto ?? "1";
    const page = Math.max(1, Number(sp.page ?? "1") || 1);
    const pageSize = 20;

    const data = await listCompanions({
        user,
        q,
        tags,
        gender,
        minAge,
        maxAge,
        hasPhoto,
        page,
        pageSize,
        includeAdult: true,
    });

    const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
    const baseParams = {
        q,
        tags,
        gender,
        minAge: minAge?.toString(),
        maxAge: maxAge?.toString(),
        hasPhoto: hasPhotoParam,
    };

    const activeFilterCount =
        [q, tags, gender, minAge, maxAge].filter(Boolean).length +
        (hasPhotoParam === "all" ? 1 : 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Companions</h1>
                        <span className="rounded-full bg-rose-600/80 px-2.5 py-0.5 text-xs font-bold text-white">
                            18+
                        </span>
                    </div>
                    <p className="text-sm text-white/40">
                        {data.total.toLocaleString()} companions · SAFE + Adult
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="/adult/companions/new"
                        className="hidden sm:flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
                    >
                        + Create
                    </a>
                    <AdultCompanionFilterPanel
                        currentQ={q}
                        currentTags={tags}
                        currentGender={gender ?? ""}
                        currentHasPhoto={hasPhotoParam}
                        currentMinAge={sp.minAge ?? ""}
                        currentMaxAge={sp.maxAge ?? ""}
                        activeCount={activeFilterCount}
                    />
                </div>
            </div>

            {/* Horizontal filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {/* Gender pills */}
                {GENDER_PILLS.map((pill) => {
                    const isActive = (gender ?? "") === pill.gender && !tags;
                    return (
                        <a
                            key={pill.label}
                            href={`/adult/companions${qs({ ...baseParams, gender: pill.gender || undefined, tags: undefined, page: "1" })}`}
                            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                                isActive
                                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                                    : "text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                            }`}
                        >
                            {pill.label}
                        </a>
                    );
                })}

                {/* Divider */}
                <span className="shrink-0 self-center h-4 w-px bg-white/10" />

                {/* Category pills */}
                {CATEGORY_PILLS.map((cat) => {
                    const isActive = tags === cat.value;
                    return (
                        <a
                            key={cat.value}
                            href={`/adult/companions${qs({ ...baseParams, tags: cat.value, page: "1" })}`}
                            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150 ${
                                isActive
                                    ? "bg-white/[0.15] text-white border border-white/[0.15]"
                                    : "text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                            }`}
                        >
                            {cat.label}
                        </a>
                    );
                })}
            </div>

            {/* Active filter chips */}
            {(q || (tags && !CATEGORY_PILLS.find((c) => c.value === tags))) && (
                <div className="flex flex-wrap gap-2">
                    {q && (
                        <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/[0.08] px-3 py-1 text-xs text-rose-300">
                            &ldquo;{q}&rdquo;
                            <a href={`/adult/companions${qs({ ...baseParams, q: undefined, page: "1" })}`} className="text-rose-400 hover:text-white">×</a>
                        </span>
                    )}
                </div>
            )}

            {/* Card grid — 5 columns max */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {data.items.map((c) => (
                    <CompanionCard key={c.id} c={c} />
                ))}
            </div>

            {data.items.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-white/30">
                    <p className="text-lg font-semibold">No companions found</p>
                    <p className="text-sm mt-1">Try a different search or filter</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="space-y-1">
                    <Pagination
                        page={page}
                        totalPages={totalPages}
                        buildHref={(p) => `/adult/companions${qs({ ...baseParams, page: String(p) })}`}
                    />
                    <p className="text-center text-xs text-white/20">
                        Page {data.page} of {totalPages}
                    </p>
                </div>
            )}
        </div>
    );
}
