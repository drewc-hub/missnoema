import React from "react";
import { getAuthedUser } from "@/lib/auth";
import { listCompanions } from "@/lib/companions";
import { Card, CardBody, CardHeader, Input, Button, Badge } from "@/components/ui";
import { Pagination } from "@/components/Pagination";

type SearchParams = { q?: string; tags?: string; page?: string };

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

function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

function CompanionCard({ c }: { c: ApiItem }) {
  const ratingTone = c.contentRating === "ADULT" ? "adult" : "safe";
  return (
    <a
      href={`/chat?companion=${encodeURIComponent(c.slug)}`}
      className="group block overflow-hidden rounded-2xl border border-blue-900/60 bg-zinc-950 shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:border-blue-700/60 hover:shadow-lg hover:shadow-blue-950/50"
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
        {/* badge top-left */}
        <div className="absolute left-3 top-3">
          <Badge tone={ratingTone}>{c.contentRating}</Badge>
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

export default async function SafeCompanionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getAuthedUser();

  const q = (sp.q ?? "").trim();
  const tags = (sp.tags ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 12;

  const data = await listCompanions({ user, q, tags, page, pageSize, includeAdult: false });
  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const baseParams = { q, tags };

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Companion library</h1>
          <p className="text-sm text-zinc-400">Safe-for-work companions. Click to start a chat.</p>
        </div>
        <a href="/adult/companions">
          <Badge tone="adult">18+ section →</Badge>
        </a>
      </div>

      <Card>
        <CardHeader title="Search" />
        <CardBody>
          <form method="get" className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="space-y-1 md:col-span-6">
              <div className="text-xs text-zinc-400">Search</div>
              <Input name="q" placeholder="Search..." defaultValue={q} />
            </div>
            <div className="space-y-1 md:col-span-4">
              <div className="text-xs text-zinc-400">Tags</div>
              <Input name="tags" placeholder="witty, calm, fantasy" defaultValue={tags} />
            </div>
            <div className="flex gap-2 md:col-span-2 md:justify-end">
              <Button type="submit" className="h-10">Apply</Button>
              <a href="/companions"><Button type="button" variant="secondary" className="h-10">Clear</Button></a>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((c) => <CompanionCard key={c.id} c={c} />)}
      </div>

      <div className="space-y-1">
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => `/companions${qs({ ...baseParams, page: String(p) })}`}
        />
        <p className="text-center text-xs text-zinc-600">
          Page {data.page} of {totalPages} &middot; {data.total} companions
        </p>
      </div>
    </main>
  );
}
