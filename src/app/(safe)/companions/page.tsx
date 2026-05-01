// file: src/app/companions/page.tsx
import React from "react";
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

type SearchParams = {
  q?: string;
  tags?: string;
  includeAdult?: string;
  page?: string;
  pageSize?: string;
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

function CompanionCard({ c }: { c: ApiItem }) {
  const isFeatured = typeof c.featuredRank === "number" && c.featuredRank > 0;

  return (
    <a href={`/companions/${c.slug}`} className="group">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 transition hover:bg-zinc-900/70">
        <div className="relative aspect-[4/3] w-full bg-zinc-950">
          {c.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={c.thumbnailUrl}
              alt={`${c.name} cover`}
              className="h-full w-full object-cover transition group-hover:scale-[1.02]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-zinc-500">
              No cover yet
            </div>
          )}

          <div className="absolute left-3 top-3">
            <Badge tone={c.contentRating === "ADULT" ? "adult" : "safe"}>
              {c.contentRating}
            </Badge>
          </div>

          {isFeatured ? (
            <div className="absolute right-3 top-3 rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-200 ring-1 ring-zinc-800">
              Featured #{c.featuredRank}
            </div>
          ) : null}

          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-200 ring-1 ring-zinc-800">
              🖼 {c.imagesCount ?? 0}
            </span>
            <span className="rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-200 ring-1 ring-zinc-800">
              🎬 {c.videosCount ?? 0}
            </span>
          </div>
        </div>

        <div className="p-5">
          <div className="truncate text-lg font-semibold group-hover:text-white">
            {c.name}
          </div>
          <div className="mt-1 line-clamp-2 text-sm text-zinc-400">
            {c.description}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {c.tags.slice(0, 6).map((t) => (
              <span
                key={t}
                className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </a>
  );
}

export default async function CompanionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);

  const q = (sp.q ?? "").trim();
  const tags = (sp.tags ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = Math.min(30, Math.max(6, Number(sp.pageSize ?? "12") || 12));
  const includeAdult = allowAdult && sp.includeAdult === "1";

  const data = await listCompanions({
    user,
    q,
    tags,
    page,
    pageSize,
    includeAdult,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  const baseParams = {
    q,
    tags,
    includeAdult: includeAdult ? "1" : undefined,
  };

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Companion library
          </h1>
          <p className="text-sm text-zinc-400">
            SAFE by default
            {allowAdult ? ". Verified users can opt into 18+." : "."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={includeAdult ? "adult" : "safe"}>
            {includeAdult ? "SAFE + ADULT" : "SAFE"}
          </Badge>
          {user ? (
            <Badge tone="safe">{user.email ?? "Logged in"}</Badge>
          ) : (
            <Badge>Guest</Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader
          title="Search & Filters"
          subtitle={
            allowAdult
              ? "Verified users can opt into 18+ (web-only)."
              : "Login + verify to access 18+."
          }
        />
        <CardBody className="space-y-4">
          <form
            method="get"
            className="grid gap-3 md:grid-cols-12 md:items-end"
          >
            <div className="space-y-1 md:col-span-5">
              <div className="text-xs text-zinc-400">Search</div>
              <Input name="q" placeholder="Search..." defaultValue={q} />
            </div>

            <div className="space-y-1 md:col-span-5">
              <div className="text-xs text-zinc-400">
                Tags (comma-separated)
              </div>
              <Input
                name="tags"
                placeholder="romance, cozy, fantasy"
                defaultValue={tags}
              />
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              {allowAdult ? (
                <label className="flex items-center gap-2 text-sm text-zinc-300">
                  <input
                    className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                    type="checkbox"
                    name="includeAdult"
                    value="1"
                    defaultChecked={includeAdult}
                  />
                  Include 18+
                </label>
              ) : (
                <span className="text-xs text-zinc-500">18+ locked</span>
              )}
            </div>

            <div className="md:col-span-12 flex flex-wrap gap-2">
              <Button type="submit" className="h-10">
                Apply
              </Button>
              <a
                href={`/companions${qs({ includeAdult: includeAdult ? "1" : undefined })}`}
              >
                <Button type="button" variant="secondary" className="h-10">
                  Clear filters
                </Button>
              </a>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((c) => (
          <CompanionCard key={c.id} c={c} />
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-zinc-500">
          Page <span className="text-zinc-200">{data.page}</span> of{" "}
          <span className="text-zinc-200">{totalPages}</span>
        </div>

        <div className="flex gap-2">
          <a
            className={page <= 1 ? "pointer-events-none opacity-40" : ""}
            href={`/companions${qs({ ...baseParams, page: String(page - 1) })}`}
          >
            <Button variant="secondary">Prev</Button>
          </a>

          <a
            className={
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }
            href={`/companions${qs({ ...baseParams, page: String(page + 1) })}`}
          >
            <Button variant="secondary">Next</Button>
          </a>
        </div>
      </div>
    </main>
  );
}
