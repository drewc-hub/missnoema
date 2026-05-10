// file: src/app/adult/companions/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { listCompanions } from "@/lib/companions";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Badge,
} from "@/components/ui";
import { Pagination } from "@/components/Pagination";

type SearchParams = {
  q?: string;
  tags?: string;
  page?: string;
  pageSize?: string;
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
  featuredRank?: number | null;
};

function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

function CardLink({ c }: { c: ApiItem }) {
  const ratingTone = c.contentRating === "ADULT" ? "adult" : "safe";
  return (
    <a
      href={`/adult/chat?companion=${encodeURIComponent(c.slug)}`}
      className="group block overflow-hidden rounded-2xl border border-blue-900/60 bg-zinc-950 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-rose-900/50 hover:shadow-lg hover:shadow-rose-950/30"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-900">
        {c.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={c.thumbnailUrl}
            alt={`${c.name} cover`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-zinc-700 select-none">
            {c.name[0]}
          </div>
        )}
        {/* gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/30 to-transparent" />
        {/* top badges */}
        <div className="absolute left-3 top-3">
          <Badge tone={ratingTone}>{c.contentRating}</Badge>
        </div>
        {typeof c.featuredRank === "number" && c.featuredRank > 0 ? (
          <div className="absolute right-3 top-3 rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-200 ring-1 ring-zinc-700 backdrop-blur-sm">
            Featured #{c.featuredRank}
          </div>
        ) : null}
        {/* media counts bottom-right */}
        <div className="absolute right-3 bottom-14 flex items-center gap-1.5">
          <span className="rounded-full bg-zinc-950/70 px-2 py-0.5 text-[11px] text-zinc-300 ring-1 ring-zinc-700 backdrop-blur-sm">
            🖼 {c.imagesCount ?? 0}
          </span>
          <span className="rounded-full bg-zinc-950/70 px-2 py-0.5 text-[11px] text-zinc-300 ring-1 ring-zinc-700 backdrop-blur-sm">
            🎬 {c.videosCount ?? 0}
          </span>
        </div>
        {/* name + description over image bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="truncate text-lg font-semibold text-white leading-tight">{c.name}</div>
          <div className="mt-0.5 line-clamp-2 text-xs text-zinc-300 leading-relaxed">{c.description}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.tags.slice(0, 4).map((t) => (
              <span key={t} className="rounded-full bg-zinc-900/70 px-2 py-0.5 text-[11px] text-zinc-300 ring-1 ring-zinc-700/60 backdrop-blur-sm">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </a>
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
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = Math.min(30, Math.max(6, Number(sp.pageSize ?? "12") || 12));

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
  const baseParams = { q, tags, gender, minAge: minAge?.toString(), maxAge: maxAge?.toString(), hasPhoto: sp.hasPhoto ?? "1" };

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Adult companion library
          </h1>
          <p className="text-sm text-zinc-400">
            Web-only 18+. Verified access. SAFE + ADULT are visible here.
          </p>
        </div>
        <Badge tone="adult">18+ verified</Badge>
      </div>

      <Card>
        <CardHeader
          title="Search"
          subtitle="Search within the adult library."
          right={
            <div className="flex items-center gap-2">
              <Button type="submit" form="companion-filter" className="h-9">Apply</Button>
              <a href="/adult/companions"><Button type="button" variant="secondary" className="h-9">Clear</Button></a>
              <a href="/adult/companions/media"><Button type="button" variant="secondary" className="h-9">📷 No photo</Button></a>
            </div>
          }
        />
        <CardBody className="space-y-4">
          <form id="companion-filter" method="get" className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="space-y-1 md:col-span-4">
              <div className="text-xs text-zinc-400">Search</div>
              <Input name="q" placeholder="Name or description..." defaultValue={q} />
            </div>
            <div className="space-y-1 md:col-span-3">
              <div className="text-xs text-zinc-400">Tags</div>
              <Input name="tags" placeholder="dominant, fantasy, elf" defaultValue={tags} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-zinc-400">Gender</div>
              <select name="gender" defaultValue={gender ?? ""} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
                <option value="">All genders</option>
                {["Female","Male","Non-Binary","Trans","Bisexual","Lesbian","Gay","Androgynous"].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs text-zinc-400">Photo</div>
              <select name="hasPhoto" defaultValue={sp.hasPhoto ?? "1"} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100">
                <option value="1">Has photo</option>
                <option value="all">All</option>
                <option value="0">No photo</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-1">
              <div className="text-xs text-zinc-400">Min age</div>
              <Input name="minAge" type="number" placeholder="18" min={18} defaultValue={sp.minAge ?? ""} />
            </div>
            <div className="space-y-1 md:col-span-1">
              <div className="text-xs text-zinc-400">Max age</div>
              <Input name="maxAge" type="number" placeholder="Any" defaultValue={sp.maxAge ?? ""} />
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((c) => (
          <CardLink key={c.id} c={c} />
        ))}
      </div>

      <div className="space-y-1">
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => `/adult/companions${qs({ ...baseParams, page: String(p) })}`}
        />
        <p className="text-center text-xs text-zinc-600">
          Page {data.page} of {totalPages} &middot; {data.total} companions
        </p>
      </div>
    </main>
  );
}
