import React from "react";
import { getAuthedUser } from "@/lib/auth";
import { listCompanions } from "@/lib/companions";
import { isAdultAllowed } from "@/lib/ratings";
import { Pagination } from "@/components/Pagination";
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
  imagesCount?: number;
  videosCount?: number;
};

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

function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

function CompanionCard({ c }: { c: ApiItem }) {
  const viewHref =
    c.contentRating === "ADULT"
      ? `/adult/companions/${encodeURIComponent(c.slug)}`
      : `/companions/${encodeURIComponent(c.slug)}`;
  const chatHref =
    c.contentRating === "ADULT"
      ? `/adult/chat?companion=${encodeURIComponent(c.slug)}`
      : `/chat?companion=${encodeURIComponent(c.slug)}`;

  return (
    <a
      href={viewHref}
      className="group relative block overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d1a] transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50"
      style={{ aspectRatio: "188/330" }}
    >
      {/* Image */}
      {c.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.thumbnailUrl}
          alt={c.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] text-5xl font-black text-white/10 select-none">
          {c.name[0]}
        </div>
      )}

      {/* Always-on gradient at bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/40 to-transparent" />

      {/* Name always visible */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="truncate font-semibold text-white text-sm leading-tight">
          {c.name}
        </div>

        {/* Description — visible on hover */}
        <div className="mt-1 text-xs text-white/60 leading-relaxed line-clamp-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 max-h-0 group-hover:max-h-12 overflow-hidden">
          {c.description}
        </div>

        {/* Chat button — visible on hover */}
        <div className="mt-2 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
          <button
            onClick={(e) => {
              e.preventDefault();
              window.location.href = chatHref;
            }}
            className="flex w-full items-center justify-center gap-1.5 h-9 rounded-[20px] bg-white/90 text-black text-xs font-bold hover:bg-white transition"
          >
            <MessageSquare className="h-3.5 w-3.5" />
            Chat now
          </button>
        </div>
      </div>

      {/* Adult badge */}
      {c.contentRating === "ADULT" && (
        <div className="absolute top-2 left-2 rounded-full bg-rose-600/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          18+
        </div>
      )}
    </a>
  );
}

export default async function SafeCompanionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);

  const q = (sp.q ?? "").trim();
  const tags = (sp.tags ?? "").trim();
  const gender = (sp.gender ?? "").trim() || undefined;
  const minAge = sp.minAge ? Number(sp.minAge) : undefined;
  const maxAge = sp.maxAge ? Number(sp.maxAge) : undefined;
  const hasPhoto = sp.hasPhoto === "0" ? false : sp.hasPhoto === "all" ? undefined : true;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 24;

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
    includeAdult: allowAdult,
  });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const baseParams = {
    q,
    tags,
    gender,
    minAge: minAge?.toString(),
    maxAge: maxAge?.toString(),
    hasPhoto: sp.hasPhoto ?? "1",
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Companions
          </h1>
          <p className="text-sm text-white/40">
            {data.total.toLocaleString()} companions
            {allowAdult ? " · SAFE + 18+" : " · Safe for work"}
          </p>
        </div>
        <a
          href="/companions/new"
          className="hidden sm:flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
        >
          + Create
        </a>
      </div>

      {/* Category pills — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_TAGS.map((cat) => {
          const isActive = tags === cat.value;
          return (
            <a
              key={cat.value}
              href={`/companions${qs({ ...baseParams, tags: cat.value, page: "1" })}`}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-150
                ${isActive
                  ? "bg-white/[0.15] text-white"
                  : "text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                }
              `}
              style={isActive ? { border: "1px solid rgba(255,255,255,0.15)" } : {}}
            >
              {cat.label}
            </a>
          );
        })}

        {/* Search form inline */}
        <form
          method="get"
          action="/companions"
          className="ml-auto flex shrink-0 items-center gap-2"
        >
          <input type="hidden" name="hasPhoto" value={sp.hasPhoto ?? "1"} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search..."
            className="h-8 w-40 rounded-full border border-white/[0.10] bg-white/[0.06] px-3 text-xs text-white placeholder-white/30 outline-none focus:border-white/20 transition"
          />
          <button
            type="submit"
            className="h-8 rounded-full bg-white/[0.08] px-3 text-xs font-medium text-white/60 hover:text-white hover:bg-white/[0.12] transition"
          >
            Go
          </button>
        </form>
      </div>

      {/* Card grid */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {data.items.map((c) => (
          <CompanionCard key={c.id} c={c} />
        ))}
      </div>

      {data.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <p className="text-lg font-semibold">No companions found</p>
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="space-y-1">
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => `/companions${qs({ ...baseParams, page: String(p) })}`}
          />
          <p className="text-center text-xs text-white/20">
            Page {data.page} of {totalPages}
          </p>
        </div>
      )}
    </div>
  );
}
