import {
  BookOpen,
  Bookmark,
  Coins,
  Compass,
  ImageIcon,
  MessageCircle,
  Plus,
  Sparkles,
  Swords,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { ContentRating, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { listCompanions } from "@/lib/companions";
import { prisma } from "@/lib/prisma";
import { isAdultAllowed } from "@/lib/ratings";

type TavernCompanion = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  contentRating: "SAFE" | "ADULT";
  thumbnailUrl: string | null;
  focalX: number;
  focalY: number;
};

function ActionLink({
  href,
  label,
  icon: Icon,
  primary = false,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  primary?: boolean;
}) {
  return (
    <a
      href={href}
      className={
        primary
          ? "inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
          : "inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </a>
  );
}

function CompanionTile({ companion }: { companion: TavernCompanion }) {
  const chatHref =
    companion.contentRating === "ADULT"
      ? `/adult/chat?companion=${encodeURIComponent(companion.slug)}`
      : `/companions/${encodeURIComponent(companion.slug)}/start`;

  return (
    <a
      href={chatHref}
      className="group block overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 transition hover:-translate-y-0.5 hover:border-fuchsia-500/60"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
        {companion.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companion.thumbnailUrl}
            alt={`${companion.name} portrait`}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
            style={{
              objectPosition: `${companion.focalX}% ${companion.focalY}%`,
            }}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-zinc-700">
            {companion.name.slice(0, 1)}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="truncate text-sm font-semibold text-white">
            {companion.name}
          </div>
          <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">
            {companion.description}
          </div>
        </div>
      </div>
      <div className="flex min-h-12 flex-wrap gap-1.5 p-3">
        {companion.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400"
          >
            {tag}
          </span>
        ))}
      </div>
    </a>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
        <Icon className="h-4 w-4 text-fuchsia-300" />
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}

export default async function TavernPage() {
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);
  const allowedRatings = allowAdult
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];
  const [companions, account, recentConversations, totalCompanions] =
    await Promise.all([
      listCompanions({
        user,
        page: 1,
        pageSize: 6,
        includeAdult: allowAdult,
        hasPhoto: true,
      }),
      user
        ? prisma.user.findUnique({
            where: { id: user.id },
            select: {
              coinBalance: true,
              loginStreak: true,
              plan: true,
            },
          })
        : Promise.resolve(null),
      user
        ? prisma.conversation.findMany({
            where: {
              userId: user.id,
              companion: { contentRating: { in: allowedRatings } },
            },
            orderBy: { updatedAt: "desc" },
            take: 4,
            select: {
              id: true,
              updatedAt: true,
              familiarity: true,
              trust: true,
              intimacy: true,
              companion: {
                select: {
                  name: true,
                  slug: true,
                  description: true,
                },
              },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { content: true },
              },
            },
          })
        : Promise.resolve([]),
      prisma.companion.count({
        where: {
          visibility: Visibility.PUBLIC,
          contentRating: { in: allowedRatings },
        },
      }),
    ]);

  const tavernCompanions = companions.items.map((companion) => ({
    id: companion.id,
    slug: companion.slug,
    name: companion.name,
    description: companion.description,
    tags: companion.tags,
    contentRating: companion.contentRating,
    thumbnailUrl: companion.thumbnailUrl,
    focalX: companion.focalX ?? 50,
    focalY: companion.focalY ?? 0,
  }));

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="overflow-hidden rounded-[1rem] border border-zinc-800 bg-black">
        <div className="relative min-h-[360px]">
          <div className="absolute inset-0">
            <div className="grid h-full grid-cols-3 opacity-60">
              {tavernCompanions.slice(0, 3).map((companion) => (
                <a
                  key={companion.id}
                  href="/rp"
                  className="relative hidden overflow-hidden bg-zinc-950 transition-opacity hover:opacity-80 sm:block"
                >
                  {companion.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={companion.thumbnailUrl}
                      alt={companion.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : null}
                </a>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/30" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />
          </div>

          <div className="relative flex min-h-[360px] max-w-3xl flex-col justify-center px-5 py-10 sm:px-8">
            <div className="inline-flex w-fit items-center gap-2 rounded-3x1 border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs font-medium text-fuchsia-200">
              <Sparkles className="h-3.5 w-3.5" />
              AI Tavern
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">
              Your fantasy roleplay hub
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300 sm:text-lg">
              Pick up an existing conversation, meet a new companion, create a
              character, or start building toward scenes and adventures from one
              place.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ActionLink
                href="/roleplay"
                label="Roleplay Forum"
                icon={MessageCircle}
                primary
              />
              <ActionLink href="/discover" label="Discover" icon={Compass} />
              <ActionLink href="/worlds" label="RP Worlds" icon={Users} />
              <ActionLink href="/companions" label="Browse" icon={Compass} />
              <ActionLink href="/companions/new" label="Create" icon={Plus} />
              <ActionLink
                href="/creator"
                label="Creator Studio"
                icon={Sparkles}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 bg-[radial gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)]">
        <Metric
          label={allowAdult ? "All companions" : "Safe companions"}
          value={totalCompanions.toLocaleString()}
          icon={Compass}
        />
        <Metric
          label="Recent chats"
          value={recentConversations.length.toString()}
          icon={MessageCircle}
        />
        <Metric
          label="Coins"
          value={account ? account.coinBalance.toLocaleString() : "Guest"}
          icon={Coins}
        />
        <Metric
          label="Plan"
          value={account?.plan ?? "Browse"}
          icon={Sparkles}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Featured companions
              </h2>
              <p className="text-sm text-zinc-400">
                Start here, then we will layer discovery and structured scenes
                on top.
              </p>
            </div>
            <a
              href="/companions"
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-sm font-semibold text-zinc-300 transition hover:border-fuchsia-500/70 hover:text-white"
            >
              <Compass className="h-4 w-4" />
              View all
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {tavernCompanions.map((companion) => (
              <CompanionTile key={companion.id} companion={companion} />
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1rem] border border-zinc-800 bg-[radial gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Recent tables
                </h2>
                <p className="text-sm text-zinc-200">
                  Your latest companion sessions.
                </p>
              </div>
              <BookOpen className="h-5 w-5 text-fuchsia-300" />
            </div>

            <div className="mt-4 space-y-3">
              {recentConversations.length > 0 ? (
                recentConversations.map((conversation) => (
                  <a
                    key={conversation.id}
                    href={`/companions/${encodeURIComponent(conversation.companion.slug)}/start`}
                    className="block rounded-lg border border-zinc-800 bg-black p-3 transition hover:border-fuchsia-500/60"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="truncate text-sm font-semibold text-white">
                        {conversation.companion.name}
                      </div>
                      <div className="shrink-0 text-[11px] text-zinc-500">
                        {conversation.updatedAt.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-400">
                      {conversation.messages[0]?.content ??
                        conversation.companion.description}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-zinc-500">
                      <span>Fam {conversation.familiarity}</span>
                      <span>Trust {conversation.trust}</span>
                      <span>Int {conversation.intimacy}</span>
                    </div>
                  </a>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-200">
                  No recent chats yet. Choose a companion to open your first
                  table.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)] p-4">
            <h2 className="text-lg font-semibold text-white">Quick actions</h2>
            <div className="mt-4 grid gap-3">
              <ActionLink
                href="/companions/media"
                label="Media Gallery"
                icon={ImageIcon}
              />
              <ActionLink
                href="/discover"
                label="Discover Companions"
                icon={Compass}
              />
              <ActionLink
                href="/discover/saved"
                label="Saved Companions"
                icon={Bookmark}
              />
              <ActionLink
                href="/account/billing"
                label="Coins and Plan"
                icon={Coins}
              />
              <ActionLink href="/adult" label="Adult Section" icon={Swords} />
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
