import React from "react";
import { getAuthedUser } from "@/lib/auth";
import { listCompanions, listSlideCompanions } from "@/lib/companions";
import { isAdultAllowed } from "@/lib/ratings";
import { Pagination } from "@/components/Pagination";
import { CompanionFilterPanel } from "@/components/CompanionFilterPanel";
import { CompanionHeroSlideshow } from "@/components/CompanionHeroSlideshow";
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
};

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
      : `/rpg?companion=${encodeURIComponent(c.slug)}`;

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

        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/40 to-transparent" />

        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="truncate text-sm font-semibold leading-tight text-white">
            {c.name}
          </div>

          <div className="mt-1 max-h-0 overflow-hidden text-xs leading-relaxed text-white/60 opacity-0 transition-opacity duration-200 group-hover:max-h-12 group-hover:opacity-100 line-clamp-2">
            {c.description}
          </div>
        </div>
      </a>

      <div className="absolute bottom-3 left-3 right-3 z-10 mt-2 opacity-0 translate-y-1 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
        <a
          href={chatHref}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-[20px] bg-white/90 text-xs font-bold text-black transition hover:bg-white"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          {c.contentRating === "ADULT" ? "Chat now" : "Roleplay"}
        </a>
      </div>

      {c.contentRating === "ADULT" && (
        <div className="absolute left-2 top-2 rounded-full bg-rose-600/80 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          18+
        </div>
      )}
    </div>
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
  const hasPhoto =
    sp.hasPhoto === "0" ? false : sp.hasPhoto === "all" ? undefined : true;
  const hasPhotoParam = sp.hasPhoto ?? "1";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 20;

  const [data, slides] = await Promise.all([
    listCompanions({
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
    }),
    listSlideCompanions({ user, includeAdult: allowAdult, limit: 6 }),
  ]);
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
      {/* Slideshow hero */}
      {slides.length > 0 && <CompanionHeroSlideshow items={slides} />}

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
        <div className="flex items-center gap-2">
          <a
            href="/companions/new"
            className="hidden sm:flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            + Create
          </a>
          <CompanionFilterPanel
            basePath="/companions"
            currentQ={q}
            currentTags={tags}
            currentHasPhoto={hasPhotoParam}
            activeCount={activeFilterCount}
          />
        </div>
      </div>

      {/* Active filter chips */}
      {(q || tags) && (
        <div className="flex flex-wrap gap-2">
          {q && (
            <span className="flex items-center gap-1.5 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/[0.08] px-3 py-1 text-xs text-fuchsia-300">
              &ldquo;{q}&rdquo;
              <a
                href={`/companions${qs({ ...baseParams, q: undefined, page: "1" })}`}
                className="text-fuchsia-400 hover:text-white"
              >
                ×
              </a>
            </span>
          )}
          {tags && (
            <span className="flex items-center gap-1.5 rounded-full border border-white/[0.10] bg-white/[0.05] px-3 py-1 text-xs text-white/60">
              {tags}
              <a
                href={`/companions${qs({ ...baseParams, tags: undefined, page: "1" })}`}
                className="text-white/40 hover:text-white"
              >
                ×
              </a>
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
          <p className="text-sm mt-1">Try a different search or category</p>
        </div>
      )}

      {totalPages > 1 && (
        <div className="space-y-1">
          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) =>
              `/companions${qs({ ...baseParams, page: String(p) })}`
            }
          />
          <p className="text-center text-xs text-white/20">
            Page {data.page} of {totalPages}
          </p>
        </div>
      )}
    </div>
  );
}
