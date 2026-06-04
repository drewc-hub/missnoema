import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  ImageIcon,
  MessageCircle,
  Sparkles,
  Swords,
} from "lucide-react";
import { ContentRating, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CreateRpCampaignButton from "@/components/rp/CreateRpCampaignButton";

export default async function CompanionStartPage({
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
      slug: true,
      name: true,
      description: true,
      tags: true,
      profile: true,
      assets: {
        where: { type: "IMAGE", contentRating: ContentRating.SAFE },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true, publicUrl: true, metadata: true },
      },
    },
  });

  if (!companion) {
    redirect(`/companions/${encodeURIComponent(slug)}`);
  }

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};
  const asset = companion.assets[0];
  const imageUrl = asset ? (asset.publicUrl ?? `/media/${asset.id}`) : null;
  const assetMeta = (asset?.metadata ?? {}) as Record<string, unknown>;
  const objectPos = `${assetMeta.focalX ?? 50}% ${assetMeta.focalY ?? 0}%`;
  const scene =
    typeof profile.scene === "string"
      ? profile.scene
      : typeof profile.scenario === "string"
        ? profile.scenario
        : "";

  return (
    <main className="mx-auto max-w-6xl space-y-6 text-zinc-100">
      <a
        href={`/companions/${encodeURIComponent(companion.slug)}`}
        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to profile
      </a>

      <section className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <div className="grid lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
          <div className="relative min-h-[360px] bg-zinc-950">
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={`${companion.name} portrait`}
                className="h-full w-full object-cover"
                style={{ objectPosition: objectPos }}
              />
            ) : (
              <div className="flex h-full min-h-[360px] items-center justify-center text-7xl font-semibold text-zinc-800">
                {companion.name.slice(0, 1)}
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="inline-flex items-center rounded-full border border-emerald-900/60 bg-emerald-950/70 px-3 py-1 text-xs font-semibold text-emerald-200">
                SAFE
              </div>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white">
                {companion.name}
              </h1>
            </div>
          </div>

          <div className="flex flex-col justify-center p-5 sm:p-7">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">
              <Sparkles className="h-3.5 w-3.5" />
              Choose play mode
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-300">
              {companion.description}
            </p>
            {scene ? (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  <BookOpen className="h-4 w-4 text-fuchsia-300" />
                  Scene seed
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-zinc-300">
                  {scene}
                </p>
              </div>
            ) : null}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <a
                href={`/chat?companion=${encodeURIComponent(companion.slug)}`}
                className="group rounded-lg border border-zinc-800 bg-zinc-950 p-4 transition hover:border-fuchsia-500/60"
              >
                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                  <MessageCircle className="h-5 w-5 text-fuchsia-300" />
                  Companion Chat
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  Open-ended character development, relationship continuity, and
                  normal companion conversation.
                </p>
              </a>

              <div className="group rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 p-4 transition hover:border-fuchsia-400">
                <div className="flex items-center gap-2 text-lg font-semibold text-white">
                  <Swords className="h-5 w-5 text-fuchsia-300" />
                  Story Mode
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  Persistent narrative play with saved turns, narrator
                  responses, and scene state.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <CreateRpCampaignButton
                    companionSlug={companion.slug}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Start saved story
                  </CreateRpCampaignButton>
                  <a
                    href={`/rpg?companion=${encodeURIComponent(companion.slug)}`}
                    className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
                  >
                    Open sandbox RP
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {companion.tags.slice(0, 8).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>

            <a
              href={`/companions/${encodeURIComponent(companion.slug)}/customize`}
              className="mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
            >
              <ImageIcon className="h-4 w-4" />
              Customize visuals
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
