import { ContentRating, Visibility } from "@prisma/client";
import { BadgeCheck, Check, ExternalLink, Store, X } from "lucide-react";
import {
  getMarketplaceReadiness,
  getMarketplaceState,
  type MarketplaceReadinessInput,
} from "@/lib/marketplace-readiness";

export function MarketplaceListingPanel({
  companion,
}: {
  companion: MarketplaceReadinessInput & {
    slug: string;
    visibility: Visibility;
    contentRating: ContentRating;
  };
}) {
  const readiness = getMarketplaceReadiness(companion);
  const state = getMarketplaceState(companion.visibility);
  const isSafe = companion.contentRating === ContentRating.SAFE;
  const viewHref = isSafe
    ? `/companions/${companion.slug}`
    : `/adult/companions/${companion.slug}`;

  const stateTone =
    state.tone === "public"
      ? "border-emerald-900/60 bg-emerald-950/50 text-emerald-200"
      : state.tone === "unlisted"
        ? "border-zinc-700 bg-zinc-900 text-zinc-200"
        : "border-amber-900/60 bg-amber-950/40 text-amber-200";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Store className="h-4 w-4 text-fuchsia-300" />
            Marketplace listing
          </div>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Use the builder&apos;s Visibility field, then save.
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs ${stateTone}`}>
          {state.label}
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-zinc-800 bg-black p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">{readiness.label}</div>
          <div className="text-xs text-zinc-500">{readiness.score}/5</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-900">
          <div
            className="h-full rounded-full bg-fuchsia-500"
            style={{ width: `${(readiness.score / 5) * 100}%` }}
          />
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">{state.description}</p>
      </div>

      <div className="mt-4 grid gap-2">
        {["Richer description", "3+ tags", "Personality", "Opening scene", "Cover image"].map((item) => {
          const missing = readiness.missing.includes(item);
          return (
            <div
              key={item}
              className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
            >
              <span className={missing ? "text-zinc-400" : "text-zinc-200"}>{item}</span>
              {missing ? (
                <X className="h-4 w-4 text-zinc-600" />
              ) : (
                <Check className="h-4 w-4 text-emerald-300" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a
          href={viewHref}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
        >
          <ExternalLink className="h-4 w-4" />
          View listing
        </a>
        <a
          href={isSafe ? "/marketplace" : "/adult/companions"}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
        >
          <BadgeCheck className="h-4 w-4" />
          {isSafe ? "Open market" : "Adult library"}
        </a>
      </div>
    </div>
  );
}
