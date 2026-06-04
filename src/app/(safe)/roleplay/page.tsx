import {
  BookOpen,
  Compass,
  MessageCircle,
  Plus,
  ScrollText,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import { ContentRating, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CreateRpCampaignButton from "@/components/rp/CreateRpCampaignButton";

function Stat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="h-4 w-4 text-fuchsia-300" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-black text-white">{value}</div>
    </div>
  );
}

export default async function RoleplayLobbyPage() {
  const user = await getAuthedUser();

  const [featuredCompanions, publicWorlds, myWorldsCount] = await Promise.all([
    prisma.companion.findMany({
      where: {
        visibility: Visibility.PUBLIC,
        contentRating: ContentRating.SAFE,
      },
      orderBy: [
        { featuredRank: "asc" },
        { likes: "desc" },
        { createdAt: "desc" },
      ],
      take: 8,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        tags: true,
        likes: true,
        assets: {
          where: { type: "IMAGE", contentRating: ContentRating.SAFE },
          orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { id: true, publicUrl: true, metadata: true },
        },
      },
    }),
    prisma.world.findMany({
      where: {
        isPublic: true,
        contentRating: ContentRating.SAFE,
      },
      orderBy: [{ lastActivityAt: "desc" }],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        maxMembers: true,
        _count: { select: { members: true, messages: true } },
        owner: {
          select: {
            displayName: true,
            email: true,
          },
        },
      },
    }),
    user
      ? prisma.world.count({
          where: {
            members: {
              some: { userId: user.id },
            },
          },
        })
      : Promise.resolve(0),
  ]);

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <div className="relative min-h-[360px]">
          <div className="absolute inset-0 grid grid-cols-4 opacity-45">
            {featuredCompanions.slice(0, 4).map((companion) => {
              const asset = companion.assets[0];
              const imageUrl = asset
                ? (asset.publicUrl ?? `/media/${asset.id}`)
                : null;
              return (
                <div
                  key={companion.id}
                  className="hidden overflow-hidden bg-zinc-950 sm:block"
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-full w-full object-cover object-top"
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/85 to-black/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />

          <div className="relative flex min-h-[360px] max-w-3xl flex-col justify-center px-5 py-10 sm:px-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">
              <ScrollText className="h-3.5 w-3.5" />
              Roleplay forum
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Start a scene, join a table, or run a world
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
              Use Noema characters for structured roleplay instead of dropping
              straight into a regular companion chat.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <CreateRpCampaignButton>
                Start Story Mode
              </CreateRpCampaignButton>
              <a
                href="/worlds"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
              >
                <Users className="h-4 w-4" />
                Browse tables
              </a>
              <a
                href="/worlds/studio"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
              >
                <Sparkles className="h-4 w-4" />
                Build world
              </a>
              <a
                href="/companions/new"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
              >
                <Plus className="h-4 w-4" />
                Create character
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="Solo scenes" value="Instant" icon={Swords} />
        <Stat
          label="Open tables"
          value={publicWorlds.length.toString()}
          icon={Users}
        />
        <Stat
          label="Your worlds"
          value={user ? myWorldsCount.toString() : "Login"}
          icon={BookOpen}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Choose a character for solo RP
              </h2>
              <p className="text-sm text-zinc-400">
                These open in the roleplay scene builder, not regular companion
                chat.
              </p>
            </div>
            <a
              href="/marketplace"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 transition hover:border-fuchsia-500/70 hover:text-white"
            >
              <Compass className="h-4 w-4" />
              Market
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCompanions.map((companion) => {
              const asset = companion.assets[0];
              const imageUrl = asset
                ? (asset.publicUrl ?? `/media/${asset.id}`)
                : null;
              const assetMeta = (asset?.metadata ?? {}) as Record<
                string,
                unknown
              >;
              const objectPos = `${assetMeta.focalX ?? 50}% ${assetMeta.focalY ?? 0}%`;

              return (
                <div
                  key={companion.id}
                  className="group overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition hover:-translate-y-0.5 hover:border-fuchsia-500/60"
                >
                  <a
                    href={`/companions/${encodeURIComponent(companion.slug)}/start`}
                    className="block"
                  >
                    <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
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
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <div className="line-clamp-1 text-base font-bold text-white">
                          {companion.name}
                        </div>
                        <div className="mt-1 line-clamp-2 min-h-10 text-xs leading-5 text-zinc-300">
                          {companion.description}
                        </div>
                      </div>
                    </div>
                  </a>
                  <div className="flex min-h-12 flex-wrap content-start gap-1.5 p-3">
                    {companion.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="border-t border-zinc-900 p-3">
                    <CreateRpCampaignButton
                      companionSlug={companion.slug}
                      className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-fuchsia-500 text-xs font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Start saved story
                    </CreateRpCampaignButton>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Public roleplay tables
                </h2>
                <p className="text-sm text-zinc-400">
                  Persistent worlds with forum-style turns.
                </p>
              </div>
              <Users className="h-5 w-5 text-fuchsia-300" />
            </div>

            <div className="mt-4 space-y-3">
              {publicWorlds.length > 0 ? (
                publicWorlds.map((world) => (
                  <a
                    key={world.id}
                    href={`/worlds/${world.slug}`}
                    className="block rounded-lg border border-zinc-800 bg-black p-3 transition hover:border-fuchsia-500/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-semibold text-white">
                        {world.name}
                      </div>
                      <div className="shrink-0 text-[11px] text-zinc-500">
                        {world._count.members}/{world.maxMembers}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                      {world.summary}
                    </p>
                    <div className="mt-2 text-[11px] text-zinc-500">
                      Host:{" "}
                      {world.owner.displayName ||
                        world.owner.email?.split("@")[0] ||
                        "Creator"}{" "}
                      · {world._count.messages} turns
                    </div>
                  </a>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-800 bg-black p-4 text-sm leading-6 text-zinc-500">
                  No public tables yet. Create the first roleplay world.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="text-lg font-semibold text-white">Forum tools</h2>
            <div className="mt-4 grid gap-3">
              <a
                href="/worlds"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-sm font-semibold text-zinc-300 transition hover:border-fuchsia-500/70 hover:text-white"
              >
                <Users className="h-4 w-4" />
                World lobby
              </a>
              <a
                href="/tavern"
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 text-sm font-semibold text-zinc-300 transition hover:border-fuchsia-500/70 hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
                Tavern hub
              </a>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
