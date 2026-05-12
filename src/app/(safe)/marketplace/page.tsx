import {
  BadgeCheck,
  BookOpen,
  Compass,
  Eye,
  Flame,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
} from "lucide-react";
import {
  ContentRating,
  MarketplaceListingStatus,
  MarketplaceListingType,
  Visibility,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMarketplaceReadiness } from "@/lib/marketplace-readiness";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

type SearchParams = { q?: string; page?: string };

function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) p.set(key, value);
  }
  const value = p.toString();
  return value ? `?${value}` : "";
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);
  const allowedRatings = allowAdult
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 12;

  const where = {
    listingType: MarketplaceListingType.COMPANION,
    status: MarketplaceListingStatus.PUBLISHED,
    contentRating: { in: allowedRatings },
    companion: {
      is: {
        visibility: Visibility.PUBLIC,
        contentRating: { in: allowedRatings },
      },
    },
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { subtitle: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
            { tags: { has: q } },
            { companion: { is: { slug: { contains: q, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
  };

  const [total, listings] = await Promise.all([
    prisma.marketplaceListing.count({ where }),
    prisma.marketplaceListing.findMany({
      where,
      orderBy: [
        { publishedAt: "desc" },
        { updatedAt: "desc" },
      ],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        subtitle: true,
        description: true,
        tags: true,
        priceCoins: true,
        priceUsdCents: true,
        creatorId: true,
        creator: {
          select: {
            displayName: true,
            email: true,
          },
        },
        companion: {
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            tags: true,
            profile: true,
            ownerId: true,
            contentRating: true,
            views: true,
            saves: true,
            likes: true,
            assets: {
              where: {
                type: "IMAGE",
                contentRating: { in: allowedRatings },
              },
              orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
              take: 1,
              select: { id: true, publicUrl: true },
            },
            _count: {
              select: {
                conversations: true,
                assets: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
              <BadgeCheck className="h-3.5 w-3.5" />
              Marketplace
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-tight text-white">
              Character market
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Public creator-ready companions. Paid listings and reviews come later.
            </p>

            <div className="mt-5 grid gap-2">
              {[
                { href: "/marketplace", label: "All listings", icon: Compass },
                { href: "/discover", label: "Swipe discovery", icon: Flame },
                { href: "/discover/saved", label: "Saved", icon: Shield },
                { href: "/creator", label: "Creator studio", icon: Sparkles },
                { href: "/companions", label: "Full library", icon: BookOpen },
              ].map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-sm font-semibold text-zinc-300 transition hover:border-fuchsia-500/70 hover:text-white"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-sm font-semibold text-white">Marketplace status</div>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Listings</span>
                <span className="font-semibold text-zinc-100">{total.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Rating</span>
                <span className="font-semibold text-zinc-100">
                  {allowAdult ? "SAFE + ADULT" : "SAFE"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Mode</span>
                <span className="font-semibold text-zinc-100">Free</span>
              </div>
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <form method="get" className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_112px_96px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search companions, tags, worlds, vibes..."
                  className="h-11 w-full rounded-lg border border-zinc-800 bg-black pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
              </div>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-fuchsia-500 px-5 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
              >
                Search
              </button>
              <a
                href="/marketplace"
                className={`inline-flex h-11 items-center justify-center rounded-lg border border-zinc-800 bg-black px-5 text-sm font-semibold transition hover:border-fuchsia-500/70 hover:text-white ${
                  q ? "text-zinc-200" : "pointer-events-none text-zinc-600"
                }`}
              >
                Clear
              </a>
            </form>
          </section>

          {listings.length > 0 ? (
            <section className="grid gap-4 md:grid-cols-2">
              {listings.map((listing) => {
                const companion = listing.companion;
                if (!companion) return null;
                const asset = companion.assets[0];
                const thumbnailUrl = asset
                  ? companion.contentRating === ContentRating.ADULT
                    ? `/media/${asset.id}`
                    : asset.publicUrl ?? `/media/${asset.id}`
                  : null;
                const readiness = getMarketplaceReadiness(companion);
                const creatorName =
                  listing.creator?.displayName ||
                  listing.creator?.email?.split("@")[0] ||
                  (listing.creatorId || companion.ownerId ? "Creator" : "Noema");
                const listingDescription =
                  listing.subtitle || listing.description || companion.description;
                const listingTags = listing.tags.length > 0 ? listing.tags : companion.tags;
                const priceLabel =
                  listing.priceUsdCents > 0
                    ? `$${(listing.priceUsdCents / 100).toFixed(2)}`
                    : listing.priceCoins > 0
                      ? `${listing.priceCoins.toLocaleString()} coins`
                      : "Free";
                const isAdult = companion.contentRating === ContentRating.ADULT;
                const chatHref = isAdult
                  ? `/adult/chat?companion=${encodeURIComponent(companion.slug)}`
                  : `/chat?companion=${encodeURIComponent(companion.slug)}`;
                const viewHref = isAdult
                  ? `/adult/companions/${companion.slug}`
                  : `/companions/${companion.slug}`;

                return (
                  <article
                    key={listing.id}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
                  >
                    <a href={viewHref} className="group block">
                      <div className="relative aspect-[4/3] overflow-hidden bg-zinc-900">
                        {thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl}
                            alt={`${companion.name} portrait`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-zinc-700">
                            {companion.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div
                          className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-xs ${
                            isAdult
                              ? "border-rose-900/60 bg-rose-950/60 text-rose-200"
                              : "border-emerald-900/60 bg-emerald-950/60 text-emerald-200"
                          }`}
                        >
                          {companion.contentRating}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <div className="text-lg font-semibold text-white">{listing.title}</div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">
                            {listingDescription}
                          </div>
                        </div>
                      </div>
                    </a>

                    <div className="space-y-4 p-4">
                      <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                        <span>by {creatorName}</span>
                        <span className="inline-flex items-center gap-1 text-emerald-300">
                          <Shield className="h-3.5 w-3.5" />
                          {readiness.score}/5 ready
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {listingTags.slice(0, 5).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-[11px] text-zinc-500">
                        <span>{companion.views.toLocaleString()} views</span>
                        <span>{companion.saves.toLocaleString()} saves</span>
                        <span>{companion.likes.toLocaleString()} likes</span>
                        <span>{priceLabel}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <a
                          href={chatHref}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                        >
                          <MessageCircle className="h-4 w-4" />
                          Chat
                        </a>
                        <a
                          href={viewHref}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
              <h2 className="text-2xl font-semibold text-white">No listings found</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                Try a different search or browse the full companion library.
              </p>
              <a
                href="/companions"
                className="mt-6 inline-flex h-10 items-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
              >
                Browse Library
              </a>
            </section>
          )}

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            <div>
              Page {page} of {totalPages} · {total.toLocaleString()} listings
            </div>
            <div className="flex gap-2">
              <a
                href={`/marketplace${qs({ q, page: String(Math.max(1, page - 1)) })}`}
                className={`inline-flex h-9 items-center rounded-lg border border-zinc-800 bg-black px-3 font-semibold transition hover:border-fuchsia-500/70 hover:text-white ${
                  page <= 1 ? "pointer-events-none opacity-40" : "text-zinc-200"
                }`}
              >
                Previous
              </a>
              <a
                href={`/marketplace${qs({ q, page: String(Math.min(totalPages, page + 1)) })}`}
                className={`inline-flex h-9 items-center rounded-lg border border-zinc-800 bg-black px-3 font-semibold transition hover:border-fuchsia-500/70 hover:text-white ${
                  page >= totalPages ? "pointer-events-none opacity-40" : "text-zinc-200"
                }`}
              >
                Next
              </a>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
