import { Bookmark, Compass, MessageCircle, Sparkles } from "lucide-react";
import { ContentRating, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SavedDiscoveriesPage() {
  const user = await getAuthedUser();

  if (!user) {
    return (
      <main className="space-y-6 text-zinc-100">
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200">
            <Bookmark className="h-5 w-5" />
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-white">
            Saved companions
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-zinc-400">
            Log in to keep a persistent shelf of companions you save while discovering.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <a
              href="/login"
              className="inline-flex h-10 items-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
            >
              Login
            </a>
            <a
              href="/discover"
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
            >
              <Compass className="h-4 w-4" />
              Discover
            </a>
          </div>
        </section>
      </main>
    );
  }

  const saved = await prisma.companionReaction.findMany({
    where: {
      userId: user.id,
      saved: true,
    },
    orderBy: { viewedAt: "desc" },
    select: {
      companionId: true,
      viewedAt: true,
    },
  });

  const savedAtByCompanionId = new Map(
    saved.map((reaction) => [reaction.companionId, reaction.viewedAt] as const),
  );

  const companions = await prisma.companion.findMany({
    where: {
      id: { in: saved.map((reaction) => reaction.companionId) },
      visibility: Visibility.PUBLIC,
      contentRating: ContentRating.SAFE,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      saves: true,
      views: true,
      assets: {
        where: {
          type: "IMAGE",
          contentRating: ContentRating.SAFE,
        },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, publicUrl: true },
      },
    },
  });

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
              <Bookmark className="h-3.5 w-3.5" />
              Saved discoveries
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Your saved companions
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Return to companions you marked while discovering, then start a chat when
              one feels right.
            </p>
          </div>
          <a
            href="/discover"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
          >
            <Sparkles className="h-4 w-4" />
            Discover More
          </a>
        </div>
      </section>

      {companions.length > 0 ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companions.map((companion) => {
            const asset = companion.assets[0];
            const thumbnailUrl = asset ? asset.publicUrl ?? `/media/${asset.id}` : null;
            const savedAt = savedAtByCompanionId.get(companion.id);

            return (
              <article
                key={companion.id}
                className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
              >
                <a
                  href={`/chat?companion=${encodeURIComponent(companion.slug)}`}
                  className="group block"
                >
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
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <div className="text-lg font-semibold text-white">{companion.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">
                        {companion.description}
                      </div>
                    </div>
                  </div>
                </a>

                <div className="space-y-4 p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {companion.tags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
                    <span>{companion.saves.toLocaleString()} saves</span>
                    <span>{companion.views.toLocaleString()} views</span>
                    <span>
                      {savedAt
                        ? savedAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })
                        : "Saved"}
                    </span>
                  </div>

                  <a
                    href={`/chat?companion=${encodeURIComponent(companion.slug)}`}
                    className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chat
                  </a>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-700 bg-black text-zinc-300">
            <Bookmark className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-2xl font-semibold text-white">No saves yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Save companions from the discovery deck and they will appear here.
          </p>
          <a
            href="/discover"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
          >
            <Sparkles className="h-4 w-4" />
            Start Discovering
          </a>
        </section>
      )}
    </main>
  );
}
