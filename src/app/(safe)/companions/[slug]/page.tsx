import { redirect } from "next/navigation";
import { ContentRating, Visibility } from "@prisma/client";
import {
  ArrowLeft,
  BadgeCheck,
  Compass,
  ImageIcon,
  MessageCircle,
  Shield,
  Sparkles,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export default async function SafeCompanionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getAuthedUser();

  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      contentRating: ContentRating.SAFE,
      OR: [
        { visibility: Visibility.PUBLIC },
        ...(user ? [{ ownerId: user.id }] : []),
      ],
    },
    select: {
      id: true,
      ownerId: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      profile: true,
      views: true,
      saves: true,
      likes: true,
      updatedAt: true,
      assets: {
        where: {
          type: "IMAGE",
          contentRating: ContentRating.SAFE,
        },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: { id: true, publicUrl: true },
      },
      User: {
        select: {
          displayName: true,
          email: true,
        },
      },
      _count: {
        select: {
          conversations: true,
          assets: true,
        },
      },
    },
  });

  if (!companion) {
    const adultCompanion = await prisma.companion.findFirst({
      where: {
        slug,
        contentRating: ContentRating.ADULT,
        OR: [
          { visibility: Visibility.PUBLIC },
          ...(user ? [{ ownerId: user.id }] : []),
        ],
      },
      select: { slug: true },
    });

    if (adultCompanion) {
      const adultProfilePath = `/adult/companions/${adultCompanion.slug}`;
      if (user && isAdultAllowed(user)) {
        redirect(adultProfilePath);
      }
      if (user) {
        redirect(`/adult/verify?next=${encodeURIComponent(adultProfilePath)}`);
      }
      redirect(`/login?next=${encodeURIComponent(adultProfilePath)}`);
    }

    return <main className="p-6 text-zinc-400">Companion not found.</main>;
  }

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};
  const creatorName =
    companion.User?.displayName ||
    companion.User?.email?.split("@")[0] ||
    (companion.ownerId ? "Creator" : "Noema");
  const primaryAsset = companion.assets[0];
  const avatarImageUrl =
    typeof profile.avatarImageUrl === "string" &&
    profile.avatarImageUrl.trim().length > 0
      ? profile.avatarImageUrl.trim()
      : null;
  const primaryUrl = primaryAsset
    ? (primaryAsset.publicUrl ?? `/media/${primaryAsset.id}`)
    : avatarImageUrl;
  const stats =
    profile.stats && typeof profile.stats === "object"
      ? Object.entries(profile.stats as Record<string, unknown>)
          .filter(([, value]) => typeof value === "number")
          .slice(0, 6)
      : [];
  const isOwner = Boolean(user && user.id === companion.ownerId);

  if (companion.ownerId && !companion.User && !isOwner) {
    redirect("/marketplace");
  }

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="relative min-h-[420px] bg-zinc-950">
            {primaryUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={primaryUrl}
                alt={`${companion.name} portrait`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-[420px] items-center justify-center text-7xl font-semibold text-zinc-800">
                {companion.name.slice(0, 1)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-emerald-900/60 bg-emerald-950/60 px-3 py-1 text-xs text-emerald-200">
                SAFE
              </span>
              <span className="rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
                Marketplace
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between p-5 sm:p-7">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
                <BadgeCheck className="h-3.5 w-3.5" />
                by {creatorName}
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-white">
                {companion.name}
              </h1>
              <p className="mt-4 text-sm leading-7 text-zinc-300">
                {companion.description}
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {companion.tags.slice(0, 10).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              <a
                href="/companions"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </a>
              <a
                href={`/companions/${encodeURIComponent(companion.slug)}/start`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
              >
                <MessageCircle className="h-4 w-4" />
                Roleplay
              </a>
              <a
                href={
                  isOwner
                    ? `/companions/${companion.slug}/edit`
                    : "/marketplace"
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
              >
                <Compass className="h-4 w-4" />
                {isOwner ? "Edit" : "Marketplace"}
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
            <h2 className="text-lg font-semibold text-white">Profile</h2>
            <div className="mt-4 grid gap-4 text-sm leading-6 text-zinc-400">
              {typeof profile.scene === "string" && profile.scene ? (
                <div>
                  <div className="text-xs uppercase text-zinc-600">Scene</div>
                  <p className="mt-1">{profile.scene}</p>
                </div>
              ) : null}
              {typeof profile.personality === "string" &&
              profile.personality ? (
                <div>
                  <div className="text-xs uppercase text-zinc-600">
                    Personality
                  </div>
                  <p className="mt-1">{profile.personality}</p>
                </div>
              ) : null}
              {typeof profile.background === "string" && profile.background ? (
                <div>
                  <div className="text-xs uppercase text-zinc-600">
                    Background
                  </div>
                  <p className="mt-1">{profile.background}</p>
                </div>
              ) : null}
              {stats.length ? (
                <div>
                  <div className="text-xs uppercase text-zinc-600">Stats</div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {stats.map(([label, value]) => (
                      <div
                        key={label}
                        className="rounded-md border border-zinc-800 bg-black px-2 py-1.5 text-xs"
                      >
                        <div className="text-zinc-500">{label}</div>
                        <div className="font-semibold text-zinc-200">
                          {Math.round(Number(value))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {companion.assets.length > 1 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companion.assets.slice(1).map((asset) => (
                <div
                  key={asset.id}
                  className="aspect-[4/3] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.publicUrl ?? `/media/${asset.id}`}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="text-sm font-semibold text-white">
              Marketplace stats
            </h2>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Views</span>
                <span className="font-semibold text-zinc-100">
                  {companion.views.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Saves</span>
                <span className="font-semibold text-zinc-100">
                  {companion.saves.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Chats</span>
                <span className="font-semibold text-zinc-100">
                  {companion._count.conversations}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-zinc-500">Media</span>
                <span className="font-semibold text-zinc-100">
                  {companion._count.assets}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-400">
            <div className="flex items-center gap-2 text-emerald-300">
              <Shield className="h-4 w-4" />
              Safe listing
            </div>
            <p className="mt-2">
              This companion is listed in the safe marketplace and can be used
              in roleplay scenes, chat, or discovery.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
