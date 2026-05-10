import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { listCompanions } from "@/lib/companions";
import { Badge } from "@/components/ui";
import { Pagination } from "@/components/Pagination";

type SearchParams = { page?: string; gender?: string };

function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

export default async function AdultCompanionsMediaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const user = await getAuthedUser();
  if (!isAdultAllowed(user)) {
    redirect(`/adult/verify?next=${encodeURIComponent("/adult/companions/media")}`);
  }

  const gender = (sp.gender ?? "").trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 12;

  const data = await listCompanions({
    user,
    gender,
    hasPhoto: false,
    page,
    pageSize,
    includeAdult: true,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const baseParams = { gender };

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create a look</h1>
          <p className="text-sm text-zinc-400">
            These companions don&apos;t have a photo yet. Generate or upload one — and change outfits or go further if you&apos;re verified.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge tone="adult">18+ verified</Badge>
          <a href="/adult/companions"><Badge tone="safe">← Library</Badge></a>
        </div>
      </div>

      {/* Gender quick-filter */}
      <div className="flex flex-wrap gap-2">
        {[undefined, "Female", "Male", "Non-Binary", "Trans", "Bisexual", "Lesbian", "Gay", "Androgynous"].map((g) => (
          <a
            key={g ?? "all"}
            href={`/adult/companions/media${qs({ gender: g, page: "1" })}`}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              (g ?? "") === (gender ?? "")
                ? "border-rose-500 bg-rose-700/30 text-white"
                : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
            }`}
          >
            {g ?? "All"}
          </a>
        ))}
      </div>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800 p-12 text-center text-zinc-500">
          No companions found without photos.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((c) => (
            <div
              key={c.id}
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-rose-900/50"
            >
              {/* Placeholder */}
              <div className="relative flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900">
                <div className="text-center">
                  <div className="text-5xl font-bold text-zinc-600 select-none">{c.name[0]}</div>
                  <div className="mt-2 text-xs text-zinc-600">No photo yet</div>
                </div>
                {c.gender && (
                  <div className="absolute left-3 top-3 rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">
                    {c.gender}
                  </div>
                )}
                {c.age != null && (
                  <div className="absolute right-3 top-3 rounded-full bg-zinc-950/80 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">
                    Age {c.age}
                  </div>
                )}
                <div className="absolute bottom-3 left-3">
                  <Badge tone={c.contentRating === "ADULT" ? "adult" : "safe"}>{c.contentRating}</Badge>
                </div>
              </div>
              {/* Info */}
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <div className="font-semibold text-white">{c.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{c.description}</div>
                </div>
                <div className="mt-auto flex gap-2">
                  <a
                    href={`/adult/companions/${c.slug}/edit`}
                    className="flex-1 rounded-lg bg-rose-800 py-2 text-center text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
                  >
                    Generate look
                  </a>
                  <a
                    href={`/adult/chat?companion=${c.slug}`}
                    className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
                  >
                    Chat
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1">
        <Pagination
          page={page}
          totalPages={totalPages}
          buildHref={(p) => `/adult/companions/media${qs({ ...baseParams, page: String(p) })}`}
        />
        <p className="text-center text-xs text-zinc-600">
          Page {data.page} of {totalPages} &middot; {data.total} companions without photos
        </p>
      </div>
    </main>
  );
}
