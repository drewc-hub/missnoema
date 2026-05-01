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

type SearchParams = {
  q?: string;
  tags?: string;
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

function CardLink({ c }: { c: ApiItem }) {
  return (
    <a
      href={`/adult/chat?companion=${encodeURIComponent(c.slug)}`}
      className="group"
    >
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

          {typeof c.featuredRank === "number" && c.featuredRank > 0 ? (
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
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = Math.min(30, Math.max(6, Number(sp.pageSize ?? "12") || 12));

  const data = await listCompanions({
    user,
    q,
    tags,
    page,
    pageSize,
    includeAdult: true,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const baseParams = { q, tags };

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
        />
        <CardBody className="space-y-4">
          <form
            method="get"
            className="grid gap-3 md:grid-cols-12 md:items-end"
          >
            <div className="space-y-1 md:col-span-6">
              <div className="text-xs text-zinc-400">Search</div>
              <Input name="q" placeholder="Search..." defaultValue={q} />
            </div>

            <div className="space-y-1 md:col-span-4">
              <div className="text-xs text-zinc-400">Tags</div>
              <Input
                name="tags"
                placeholder="mature, dominant, fantasy"
                defaultValue={tags}
              />
            </div>

            <div className="flex gap-2 md:col-span-2 md:justify-end">
              <Button type="submit" className="h-10">
                Apply
              </Button>
              <a href="/adult/companions">
                <Button type="button" variant="secondary" className="h-10">
                  Clear
                </Button>
              </a>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.map((c) => (
          <CardLink key={c.id} c={c} />
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
            href={`/adult/companions${qs({
              ...baseParams,
              page: String(page - 1),
            })}`}
          >
            <Button variant="secondary">Prev</Button>
          </a>

          <a
            className={
              page >= totalPages ? "pointer-events-none opacity-40" : ""
            }
            href={`/adult/companions${qs({
              ...baseParams,
              page: String(page + 1),
            })}`}
          >
            <Button variant="secondary">Next</Button>
          </a>
        </div>
      </div>
    </main>
  );
}
