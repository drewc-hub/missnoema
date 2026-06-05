import {
  BadgeCheck,
  BookOpen,
  Compass,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  Search,
  Shield,
  Sparkles,
  Star,
  Tag,
  Wallet,
} from "lucide-react";
import {
  CategoryType,
  ContentRating,
  MarketplaceListingStatus,
  MarketplaceListingType,
  Prisma,
  Visibility,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getMarketplaceReadiness } from "@/lib/marketplace-readiness";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

type SortKey = "newest" | "popular" | "liked" | "saved" | "free";
type RatingFilter = "all" | "safe" | "adult";
type PriceFilter = "all" | "free" | "coins" | "usd";

type SearchParams = {
  q?: string;
  page?: string;
  sort?: string;
  rating?: string;
  price?: string;
  category?: string;
  tag?: string;
};

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "liked", label: "Most liked" },
  { value: "saved", label: "Most saved" },
  { value: "free", label: "Free first" },
];

const ratingOptions: { value: RatingFilter; label: string }[] = [
  { value: "all", label: "All ratings" },
  { value: "safe", label: "Safe" },
  { value: "adult", label: "Adult" },
];

const priceOptions: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "Any price" },
  { value: "free", label: "Free" },
  { value: "coins", label: "Coins" },
  { value: "usd", label: "USD" },
];

function normalizeSort(value?: string): SortKey {
  return sortOptions.some((option) => option.value === value)
    ? (value as SortKey)
    : "newest";
}

function normalizeRating(value?: string): RatingFilter {
  return ratingOptions.some((option) => option.value === value)
    ? (value as RatingFilter)
    : "all";
}

function normalizePrice(value?: string): PriceFilter {
  return priceOptions.some((option) => option.value === value)
    ? (value as PriceFilter)
    : "all";
}

function qs(params: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) p.set(key, value);
  }
  const value = p.toString();
  return value ? `?${value}` : "";
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function categorySearchTerms(category: { name: string; slug: string } | null) {
  if (!category) return [];

  const cleanName = category.name
    .replace(/\s*\((?:18\+|Safe)\)\s*/gi, "")
    .trim()
    .toLowerCase();
  const cleanSlug = category.slug
    .replace(/^(?:safe|adult|trait|rel|occ|set|kink)-/i, "")
    .replace(/-/g, " ")
    .trim()
    .toLowerCase();

  return Array.from(
    new Set([
      cleanName,
      cleanSlug,
      cleanName.replace(/\s+/g, "-"),
      cleanSlug.replace(/\s+/g, "-"),
    ].filter(Boolean)),
  );
}

function buildOrderBy(
  sort: SortKey,
): Prisma.MarketplaceListingOrderByWithRelationInput[] {
  if (sort === "popular") {
    return [
      { companion: { views: "desc" } },
      { companion: { likes: "desc" } },
      { publishedAt: "desc" },
    ];
  }

  if (sort === "liked") {
    return [{ companion: { likes: "desc" } }, { publishedAt: "desc" }];
  }

  if (sort === "saved") {
    return [{ companion: { saves: "desc" } }, { publishedAt: "desc" }];
  }

  if (sort === "free") {
    return [
      { priceUsdCents: "asc" },
      { priceCoins: "asc" },
      { publishedAt: "desc" },
    ];
  }

  return [{ publishedAt: "desc" }, { updatedAt: "desc" }];
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-semibold transition ${
        active
          ? "border-fuchsia-500/70 bg-fuchsia-500/15 text-white"
          : "border-zinc-800 bg-black text-zinc-400 hover:border-fuchsia-500/60 hover:text-white"
      }`}
    >
      {children}
    </a>
  );
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);
  const q = (sp.q ?? "").trim();
  const tag = (sp.tag ?? "").trim();
  const category = (sp.category ?? "").trim();
  const sort = normalizeSort(sp.sort);
  const rating = normalizeRating(sp.rating);
  const price = normalizePrice(sp.price);
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const pageSize = 16;
  const selectedCategory = category
    ? await prisma.category.findUnique({
        where: { slug: category },
        select: { name: true, slug: true },
      })
    : null;
  const categoryTerms = categorySearchTerms(selectedCategory);

  const ratingPool =
    allowAdult && rating === "adult"
      ? [ContentRating.ADULT]
      : rating === "safe" || !allowAdult
        ? [ContentRating.SAFE]
        : [ContentRating.SAFE, ContentRating.ADULT];

  const where: Prisma.MarketplaceListingWhereInput = {
    listingType: MarketplaceListingType.COMPANION,
    status: MarketplaceListingStatus.PUBLISHED,
    contentRating: { in: ratingPool },
    companion: {
      is: {
        visibility: Visibility.PUBLIC,
        contentRating: { in: ratingPool },
        ...(category
          ? {
              OR: [
                {
                  categories: {
                    some: {
                      category: {
                        slug: category,
                        isAdult: allowAdult ? undefined : false,
                      },
                    },
                  },
                },
                ...(categoryTerms.length > 0
                  ? [
                      { tags: { hasSome: categoryTerms } },
                      ...categoryTerms.map((term) => ({
                        archetype: { contains: term, mode: Prisma.QueryMode.insensitive },
                      })),
                      ...categoryTerms.map((term) => ({
                        description: { contains: term, mode: Prisma.QueryMode.insensitive },
                      })),
                    ]
                  : []),
              ],
            }
          : {}),
      },
    },
    ...(price === "free" ? { priceCoins: 0, priceUsdCents: 0 } : {}),
    ...(price === "coins" ? { priceCoins: { gt: 0 } } : {}),
    ...(price === "usd" ? { priceUsdCents: { gt: 0 } } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { subtitle: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { has: q } },
            {
              companion: { is: { slug: { contains: q, mode: "insensitive" } } },
            },
            {
              companion: { is: { name: { contains: q, mode: "insensitive" } } },
            },
          ],
        }
      : {}),
  };

  const baseParams = {
    q: q || undefined,
    sort,
    rating: rating === "all" ? undefined : rating,
    price: price === "all" ? undefined : price,
    category: category || undefined,
    tag: tag || undefined,
  };

  const [total, listings, categories, featured] = await Promise.all([
    prisma.marketplaceListing.count({ where }),
    prisma.marketplaceListing.findMany({
      where,
      orderBy: buildOrderBy(sort),
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
                contentRating: { in: ratingPool },
              },
              orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
              take: 1,
              select: { id: true, publicUrl: true, metadata: true },
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
    prisma.category.findMany({
      where: {
        type: {
          in: [
            CategoryType.GENRE,
            CategoryType.TONE,
            CategoryType.RELATIONSHIP,
          ],
        },
        isAdult: allowAdult ? undefined : false,
      },
      orderBy: [{ order: "asc" }, { name: "asc" }],
      take: 18,
      select: { name: true, slug: true },
    }),
    prisma.marketplaceListing.findMany({
      where: {
        listingType: MarketplaceListingType.COMPANION,
        status: MarketplaceListingStatus.PUBLISHED,
        contentRating: { in: ratingPool },
        companion: {
          is: {
            visibility: Visibility.PUBLIC,
            contentRating: { in: ratingPool },
          },
        },
      },
      orderBy: [{ companion: { likes: "desc" } }, { publishedAt: "desc" }],
      take: 4,
      select: {
        id: true,
        title: true,
        priceCoins: true,
        priceUsdCents: true,
        companion: {
          select: {
            slug: true,
            name: true,
            contentRating: true,
            assets: {
              where: {
                type: "IMAGE",
                contentRating: { in: ratingPool },
              },
              orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
              take: 1,
              select: { id: true, publicUrl: true, metadata: true },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilters = [
    q,
    tag,
    category,
    rating !== "all" ? rating : "",
    price !== "all" ? price : "",
  ].filter(Boolean).length;

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="flex flex-col gap-4 border-b border-zinc-900 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">
            <BadgeCheck className="h-3.5 w-3.5" />
            Creator marketplace
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Character Market
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Browse public companions by mood, genre, rating, popularity, and
            price.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-center">
          <div>
            <div className="text-lg font-black text-white">
              {total.toLocaleString()}
            </div>
            <div className="text-[11px] uppercase text-zinc-500">Listings</div>
          </div>
          <div>
            <div className="text-lg font-black text-white">
              {allowAdult ? "All" : "Safe"}
            </div>
            <div className="text-[11px] uppercase text-zinc-500">Rating</div>
          </div>
          <div>
            <div className="text-lg font-black text-white">{activeFilters}</div>
            <div className="text-[11px] uppercase text-zinc-500">Filters</div>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Flame className="h-4 w-4 text-fuchsia-300" />
              Trending now
            </div>
            <a
              href="/discover"
              className="text-sm font-semibold text-zinc-400 hover:text-white"
            >
              Swipe discovery
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {featured.map((listing) => {
              const companion = listing.companion;
              if (!companion) return null;
              const asset = companion.assets[0];
              const thumbnailUrl = asset
                ? companion.contentRating === ContentRating.ADULT
                  ? `/media/${asset.id}`
                  : (asset.publicUrl ?? `/media/${asset.id}`)
                : null;
              const assetMeta = (asset?.metadata ?? {}) as Record<
                string,
                unknown
              >;
              const objectPos = `${assetMeta.focalX ?? 50}% ${assetMeta.focalY ?? 0}%`;
              const isAdult = companion.contentRating === ContentRating.ADULT;
              const viewHref = `/companions/${companion.slug}`;

              return (
                <a
                  key={listing.id}
                  href={viewHref}
                  className="group relative min-h-36 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition hover:border-fuchsia-500/60"
                >
                  {thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnailUrl}
                      alt={`${companion.name} portrait`}
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                      style={{ objectPosition: objectPos }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-4xl font-semibold text-zinc-700">
                      {companion.name.slice(0, 1)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <div className="flex items-center gap-1 text-[11px] font-semibold uppercase text-fuchsia-200">
                      <Star className="h-3 w-3" />
                      Featured
                    </div>
                    <div className="mt-1 line-clamp-1 text-sm font-bold text-white">
                      {listing.title}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-5 lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain lg:pr-1">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Compass className="h-4 w-4 text-fuchsia-300" />
              Filters
            </div>

            <div className="mt-4 space-y-5">
              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Rating
                </div>
                <div className="grid gap-2">
                  {ratingOptions
                    .filter((option) => allowAdult || option.value !== "adult")
                    .map((option) => (
                      <FilterLink
                        key={option.value}
                        href={`/marketplace${qs({
                          ...baseParams,
                          rating:
                            option.value === "all" ? undefined : option.value,
                          page: undefined,
                        })}`}
                        active={rating === option.value}
                      >
                        {option.label}
                      </FilterLink>
                    ))}
                </div>
              </div>

              <div>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Price
                </div>
                <div className="grid gap-2">
                  {priceOptions.map((option) => (
                    <FilterLink
                      key={option.value}
                      href={`/marketplace${qs({
                        ...baseParams,
                        price:
                          option.value === "all" ? undefined : option.value,
                        page: undefined,
                      })}`}
                      active={price === option.value}
                    >
                      {option.label}
                    </FilterLink>
                  ))}
                </div>
              </div>

              {categories.length > 0 && (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Categories
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FilterLink
                      href={`/marketplace${qs({
                        ...baseParams,
                        category: undefined,
                        page: undefined,
                      })}`}
                      active={!category}
                    >
                      All
                    </FilterLink>
                    {categories.map((item) => (
                      <FilterLink
                        key={item.slug}
                        href={`/marketplace${qs({
                          ...baseParams,
                          category: item.slug,
                          page: undefined,
                        })}`}
                        active={category === item.slug}
                      >
                        {item.name}
                      </FilterLink>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2 border-t border-zinc-900 pt-4">
                {[
                  { href: "/creator", label: "Creator studio", icon: Sparkles },
                  {
                    href: "/companions",
                    label: "Full library",
                    icon: BookOpen,
                  },
                  { href: "/discover/saved", label: "Saved", icon: Shield },
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
          </div>
        </aside>

        <div className="space-y-4">
          <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <form
              method="get"
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_164px_104px_92px]"
            >
              <input
                type="hidden"
                name="rating"
                value={rating === "all" ? "" : rating}
              />
              <input
                type="hidden"
                name="price"
                value={price === "all" ? "" : price}
              />
              <input type="hidden" name="category" value={category} />
              <input type="hidden" name="tag" value={tag} />

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  name="q"
                  defaultValue={q}
                  placeholder="Search names, tags, worlds, vibes..."
                  className="h-11 w-full rounded-lg border border-zinc-800 bg-black pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
              </div>

              <select
                name="sort"
                defaultValue={sort}
                className="h-11 rounded-lg border border-zinc-800 bg-black px-3 text-sm font-semibold text-zinc-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
              >
                <Search className="h-4 w-4" />
                Apply
              </button>

              <a
                href="/marketplace"
                className={`inline-flex h-11 items-center justify-center rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold transition hover:border-fuchsia-500/70 hover:text-white ${
                  activeFilters > 0 || sort !== "newest"
                    ? "text-zinc-200"
                    : "pointer-events-none text-zinc-600"
                }`}
              >
                Clear
              </a>
            </form>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-zinc-400">
            <div>
              Showing{" "}
              {(total === 0 ? 0 : (page - 1) * pageSize + 1).toLocaleString()}-
              {Math.min(page * pageSize, total).toLocaleString()} of{" "}
              {total.toLocaleString()}
            </div>
            {tag && (
              <a
                href={`/marketplace${qs({ ...baseParams, tag: undefined, page: undefined })}`}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs font-semibold text-zinc-300 hover:border-fuchsia-500/60 hover:text-white"
              >
                <Tag className="h-3.5 w-3.5" />
                {tag}
              </a>
            )}
          </div>

          {listings.length > 0 ? (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {listings.map((listing) => {
                const companion = listing.companion;
                if (!companion) return null;
                const asset = companion.assets[0];
                const thumbnailUrl = asset
                  ? companion.contentRating === ContentRating.ADULT
                    ? `/media/${asset.id}`
                    : (asset.publicUrl ?? `/media/${asset.id}`)
                  : null;
                const assetMeta = (asset?.metadata ?? {}) as Record<
                  string,
                  unknown
                >;
                const objectPos = `${assetMeta.focalX ?? 50}% ${assetMeta.focalY ?? 0}%`;
                const readiness = getMarketplaceReadiness(companion);
                const creatorName =
                  listing.creator?.displayName ||
                  listing.creator?.email?.split("@")[0] ||
                  (listing.creatorId || companion.ownerId
                    ? "Creator"
                    : "Noema");
                const listingDescription =
                  listing.subtitle ||
                  listing.description ||
                  companion.description;
                const listingTags =
                  listing.tags.length > 0 ? listing.tags : companion.tags;
                const priceLabel =
                  listing.priceUsdCents > 0
                    ? `$${(listing.priceUsdCents / 100).toFixed(2)}`
                    : listing.priceCoins > 0
                      ? `${formatCompact(listing.priceCoins)} coins`
                      : "Free";
                const isAdult = companion.contentRating === ContentRating.ADULT;
                const chatHref = `/companions/${encodeURIComponent(companion.slug)}/start`;
                const viewHref = `/companions/${companion.slug}`;

                return (
                  <article
                    key={listing.id}
                    className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition hover:border-fuchsia-500/60"
                  >
                    <a href={viewHref} className="block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                        {thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={thumbnailUrl}
                            alt={`${companion.name} portrait`}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                            style={{ objectPosition: objectPos }}
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-5xl font-semibold text-zinc-700">
                            {companion.name.slice(0, 1)}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        <div
                          className={`absolute left-3 top-3 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            isAdult
                              ? "border-rose-900/60 bg-rose-950/70 text-rose-200"
                              : "border-emerald-900/60 bg-emerald-950/70 text-emerald-200"
                          }`}
                        >
                          {companion.contentRating}
                        </div>
                        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full border border-zinc-700/70 bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-100">
                          <Wallet className="h-3 w-3" />
                          {priceLabel}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <div className="line-clamp-1 text-base font-bold text-white">
                            {listing.title}
                          </div>
                          <div className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-zinc-300">
                            {listingDescription}
                          </div>
                        </div>
                      </div>
                    </a>

                    <div className="space-y-3 p-3">
                      <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                        <span className="truncate">by {creatorName}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-emerald-300">
                          <Shield className="h-3.5 w-3.5" />
                          {readiness.score}/5
                        </span>
                      </div>

                      <div className="flex min-h-12 flex-wrap content-start gap-1.5">
                        {listingTags.slice(0, 3).map((item) => (
                          <a
                            key={item}
                            href={`/marketplace${qs({ ...baseParams, tag: item, page: undefined })}`}
                            className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400 transition hover:border-fuchsia-500/60 hover:text-white"
                          >
                            {item}
                          </a>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-1 text-[11px] text-zinc-500">
                        <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1">
                          <Eye className="h-3 w-3" />
                          {formatCompact(companion.views)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1">
                          <Heart className="h-3 w-3" />
                          {formatCompact(companion.likes)}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-md bg-black px-2 py-1">
                          <Shield className="h-3 w-3" />
                          {formatCompact(companion.saves)}
                        </span>
                      </div>

                      <div className="grid grid-cols-[minmax(0,1fr)_44px] gap-2">
                        <a
                          href={chatHref}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {isAdult ? "Chat" : "Choose mode"}
                        </a>
                        <a
                          href={viewHref}
                          aria-label={`View ${listing.title}`}
                          className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-black text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                        >
                          <Eye className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          ) : (
            <section className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
              <h2 className="text-2xl font-semibold text-white">
                No listings found
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                Try a different search, loosen a filter, or browse the full
                companion library.
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
                href={`/marketplace${qs({
                  ...baseParams,
                  page: String(Math.max(1, page - 1)),
                })}`}
                className={`inline-flex h-9 items-center rounded-lg border border-zinc-800 bg-black px-3 font-semibold transition hover:border-fuchsia-500/70 hover:text-white ${
                  page <= 1 ? "pointer-events-none opacity-40" : "text-zinc-200"
                }`}
              >
                Previous
              </a>
              <a
                href={`/marketplace${qs({
                  ...baseParams,
                  page: String(Math.min(totalPages, page + 1)),
                })}`}
                className={`inline-flex h-9 items-center rounded-lg border border-zinc-800 bg-black px-3 font-semibold transition hover:border-fuchsia-500/70 hover:text-white ${
                  page >= totalPages
                    ? "pointer-events-none opacity-40"
                    : "text-zinc-200"
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
