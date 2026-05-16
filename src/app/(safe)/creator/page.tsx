import {
    CircleDollarSign,
    Eye,
    ImageIcon,
    Lock,
    MessageCircle,
    Pencil,
    Plus,
    Shield,
    Sparkles,
} from "lucide-react";
import { ContentRating, MarketplaceListingStatus, Visibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMarketplaceReadiness, getMarketplaceState } from "@/lib/marketplace-readiness";

function StatusPill({
    children,
    tone = "neutral",
}: {
    children: React.ReactNode;
    tone?: "neutral" | "safe" | "adult" | "private";
}) {
    const tones = {
        neutral: "border-zinc-700 bg-zinc-900 text-zinc-200",
        safe: "border-emerald-900/60 bg-emerald-950/50 text-emerald-200",
        adult: "border-rose-900/60 bg-rose-950/50 text-rose-200",
        private: "border-amber-900/60 bg-amber-950/40 text-amber-200",
    };

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs ${tones[tone]}`}>
            {children}
        </span>
    );
}

export default async function CreatorPage() {
    const user = await getAuthedUser();
    if (!user) {
        redirect(`/login?next=${encodeURIComponent("/creator")}`);
    }

    const companions = await prisma.companion.findMany({
        where: { ownerId: user.id },
        orderBy: { updatedAt: "desc" },
        select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            tags: true,
            profile: true,
            visibility: true,
            contentRating: true,
            views: true,
            saves: true,
            likes: true,
            updatedAt: true,
            assets: {
                where: { type: "IMAGE" },
                orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
                take: 1,
                select: { id: true, publicUrl: true, contentRating: true },
            },
            _count: {
                select: {
                    conversations: true,
                    assets: true,
                },
            },
            marketplaceListings: {
                select: {
                    status: true,
                    priceCoins: true,
                    priceUsdCents: true,
                    updatedAt: true,
                },
            },
        },
    });

    const publicCount = companions.filter((c) => c.visibility === Visibility.PUBLIC).length;
    const draftCount = companions.length - publicCount;
    const listedCount = companions.filter(
        (c) => c.marketplaceListings?.status === MarketplaceListingStatus.PUBLISHED,
    ).length;

    return (
        <main className="space-y-6 text-zinc-100">
            <section className="rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Creator marketplace
                        </div>
                        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
                            Creator studio
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                            Manage your companions as marketplace-ready inventory. Publishing still
                            uses existing visibility and content rating controls.
                        </p>
                    </div>
                    <a
                        href="/companions/new"
                        className="inline-flex h-10 items-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                    >
                        <Plus className="h-4 w-4" />
                        New Companion
                    </a>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
                        <Sparkles className="h-4 w-4 text-fuchsia-300" />
                        Total
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">{companions.length}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
                        <Eye className="h-4 w-4 text-fuchsia-300" />
                        Public
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">{publicCount}</div>
                </div>
                <div className="rounded-lg border border-zinc-800  bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
                        <Lock className="h-4 w-4 text-fuchsia-300" />
                        Drafts
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">{draftCount}</div>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)] p-4">
                    <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
                        <CircleDollarSign className="h-4 w-4 text-fuchsia-300" />
                        Listed
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white">{listedCount}</div>
                </div>
            </section>

            {companions.length > 0 ? (
                <section className="space-y-4">
                    {companions.map((companion) => {
                        const asset = companion.assets[0];
                        const thumbnailUrl = asset
                            ? asset.contentRating === ContentRating.ADULT
                                ? `/media/${asset.id}`
                                : asset.publicUrl ?? `/media/${asset.id}`
                            : null;
                        const readiness = getMarketplaceReadiness(companion);
                        const listingState = getMarketplaceState(companion.visibility);
                        const listing = companion.marketplaceListings ?? null;
                        const isAdult = companion.contentRating === ContentRating.ADULT;
                        const priceLabel = listing
                            ? listing.priceUsdCents > 0
                                ? `$${(listing.priceUsdCents / 100).toFixed(2)}`
                                : listing.priceCoins > 0
                                    ? `${listing.priceCoins.toLocaleString()} coins`
                                    : "Free"
                            : "Not synced";
                        const editHref = isAdult
                            ? `/adult/companions/${companion.slug}/edit`
                            : `/companions/${companion.slug}/edit`;
                        const viewHref = isAdult
                            ? `/adult/companions/${companion.slug}`
                            : `/companions/${companion.slug}`;
                        const chatHref = isAdult
                            ? `/adult/chat?companion=${encodeURIComponent(companion.slug)}`
                            : `/chat?companion=${encodeURIComponent(companion.slug)}`;

                        return (
                            <article
                                key={companion.id}
                                className="grid overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 lg:grid-cols-[220px_minmax(0,1fr)]"
                            >
                                <div className="relative min-h-48 bg-zinc-900">
                                    {thumbnailUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={thumbnailUrl}
                                            alt={`${companion.name} portrait`}
                                            className="h-full w-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="flex h-full min-h-48 items-center justify-center text-5xl font-semibold text-zinc-700">
                                            {companion.name.slice(0, 1)}
                                        </div>
                                    )}
                                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                                        <StatusPill tone={isAdult ? "adult" : "safe"}>{companion.contentRating}</StatusPill>
                                    </div>
                                </div>

                                <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="truncate text-xl font-semibold text-white">{companion.name}</h2>
                                            <StatusPill
                                                tone={
                                                    companion.visibility === Visibility.PUBLIC
                                                        ? "safe"
                                                        : companion.visibility === Visibility.PRIVATE
                                                            ? "private"
                                                            : "neutral"
                                                }
                                            >
                                                {companion.visibility}
                                            </StatusPill>
                                        </div>

                                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">
                                            {companion.description}
                                        </p>

                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {companion.tags.slice(0, 6).map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>

                                        <div className="mt-4 grid gap-2 text-xs text-zinc-500 sm:grid-cols-5">
                                            <span>{companion.views.toLocaleString()} views</span>
                                            <span>{companion.saves.toLocaleString()} saves</span>
                                            <span>{companion.likes.toLocaleString()} likes</span>
                                            <span>{companion._count.conversations} chats</span>
                                            <span>{companion._count.assets} media</span>
                                        </div>
                                    </div>
                                    <aside className="rounded-lg border border-zinc-800 bg-black p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="text-sm font-semibold text-white">
                                                {readiness.label}
                                            </div>
                                            <div className="text-xs text-zinc-500">{readiness.score}/5</div>
                                        </div>
                                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-900">
                                            <div
                                                className="h-full rounded-full bg-fuchsia-500"
                                                style={{ width: `${(readiness.score / 5) * 100}%` }}
                                            />
                                        </div>
                                        {readiness.missing.length > 0 ? (
                                            <div className="mt-3 text-xs leading-5 text-zinc-500">
                                                Needs {readiness.missing.slice(0, 3).join(", ")}
                                            </div>
                                        ) : (
                                            <div className="mt-3 flex items-center gap-2 text-xs text-emerald-300">
                                                <Shield className="h-3.5 w-3.5" />
                                                Ready for discovery
                                            </div>
                                        )}
                                        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs leading-5 text-zinc-400">
                                            {listingState.label}: {listingState.description}
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs">
                                            <span className="text-zinc-500">Listing</span>
                                            <span className="font-semibold text-zinc-200">
                                                {listing?.status ?? "Not synced"} · {priceLabel}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-2">
                                            <a
                                                href={editHref}
                                                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Edit
                                            </a>
                                            <div className="grid grid-cols-2 gap-2">
                                                <a
                                                    href={chatHref}
                                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                    Chat
                                                </a>
                                                <a
                                                    href={viewHref}
                                                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                                                >
                                                    <Eye className="h-4 w-4" />
                                                    View
                                                </a>
                                            </div>
                                        </div>
                                    </aside>
                                </div>
                            </article>
                        );
                    })}
                </section>
            ) : (
                <section className="rounded-lg border border-dashed border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.25),transparent_55%)]  p-8 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300">
                        <ImageIcon className="h-5 w-5" />
                    </div>
                    <h2 className="mt-5 text-2xl font-semibold text-white">No companions yet</h2>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                        Create your first companion, then use this studio to prepare it for discovery.
                    </p>
                    <a
                        href="/companions/new"
                        className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                    >
                        <Plus className="h-4 w-4" />
                        Create Companion
                    </a>
                </section>
            )}
        </main>
    );
}
