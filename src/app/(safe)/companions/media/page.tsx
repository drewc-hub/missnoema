import React from "react";
import { getAuthedUser } from "@/lib/auth";
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

export default async function SafeCompanionsMediaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getAuthedUser();

  const gender = (sp.gender ?? "").trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 12;

  const data = await listCompanions({
    user,
    gender,
    hasPhoto: false,
    page,
    pageSize,
    includeAdult: false,
  });

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const baseParams = { gender };

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Create a look</h1>
          <p className="text-sm text-zinc-400">
            These companions don&apos;t have a photo yet. Generate or upload one to bring them to life.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/companions"><Badge tone="safe">← Library</Badge></a>
          <a href="/adult/companions/media"><Badge tone="adult">18+ →</Badge></a>
        </div>
      </div>

      {/* Gender quick-filter */}
      <div className="flex flex-wrap gap-2">
        {[undefined, "Female", "Male", "Non-Binary", "Trans", "Bisexual", "Lesbian", "Gay", "Androgynous"].map((g) => (
          <a
            key={g ?? "all"}
            href={`/companions/media${qs({ gender: g, page: "1" })}`}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              (g ?? "") === (gender ?? "")
                ? "border-purple-500 bg-purple-700/40 text-white"
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
              className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60 transition-all hover:border-zinc-600"
            >
              {/* Placeholder image area */}
              <div className="flex aspect-[3/4] w-full items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-900">
                <div className="text-center">
                  <div className="text-5xl font-bold text-zinc-600 select-none">{c.name[0]}</div>
                  <div className="mt-2 text-xs text-zinc-600">No photo yet</div>
                </div>
              </div>
              {/* Info */}
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <div className="font-semibold text-white">{c.name}</div>
                  <div className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{c.description}</div>
                </div>
                {(c.gender || c.age != null) && (
                  <details className="group">
                    <summary className="flex cursor-pointer select-none list-none items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                      <svg className="h-3 w-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 6 10" stroke="currentColor" strokeWidth="2"><path d="M1 1l4 4-4 4"/></svg>
                      Details
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.gender && (
                        <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">{c.gender}</span>
                      )}
                      {c.age != null && (
                        <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-700">Age {c.age}</span>
                      )}
                    </div>
                  </details>
                )}
                <div className="mt-auto">
                  <a
                    href={`/companions/${c.slug}/customize`}
                    className="block w-full rounded-lg bg-purple-700 py-2 text-center text-sm font-semibold text-white hover:bg-purple-600 transition-colors"
                  >
                    Generate look
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
          buildHref={(p) => `/companions/media${qs({ ...baseParams, page: String(p) })}`}
        />
        <p className="text-center text-xs text-zinc-600">
          Page {data.page} of {totalPages} &middot; {data.total} companions without photos
        </p>
      </div>
    </main>
  );
}
