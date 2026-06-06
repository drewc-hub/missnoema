import RpChatWorkspace from "@/components/rp/RpChatWorkspace";
import CreateRpCampaignButton from "@/components/rp/CreateRpCampaignButton";
import RpStoryList from "@/components/rp/RpStoryList";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating, Visibility } from "@prisma/client";
import { notFound } from "next/navigation";

type RpPageCompanion = {
  id: string;
  slug: string;
  name: string;
  description: string;
  archetype: string | null;
  profile: unknown;
  scenario: string | null;
  greeting: string | null;
  tags: string[];
  assets: {
    id: string;
    publicUrl: string | null;
    metadata: unknown;
    contentRating: ContentRating;
  }[];
};

type RpPageCharacter = {
  id: string;
  role: string;
  joinedAt: Date;
  companion: RpPageCompanion;
};

async function rpRosterTableExists() {
  try {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'RpCampaignCharacter'
      ) AS "exists"
    `;
    return Boolean(result[0]?.exists);
  } catch {
    return false;
  }
}

export default async function RpCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const safeCampaignId = String(campaignId ?? "").trim();

  if (!safeCampaignId || safeCampaignId.startsWith("[")) {
    notFound();
  }

  const user = await getAuthedUser();
  const hasRosterTable = await rpRosterTableExists();
  const allowedRatings = isAdultAllowed(user)
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];

  const [campaign, companionOptions, storyList] = await Promise.all([
    prisma.rpCampaign.findUnique({
      where: { id: safeCampaignId },
      include: {
        ...(hasRosterTable
          ? {
              characters: {
                orderBy: { joinedAt: "asc" },
                include: {
                  companion: {
                    select: {
                      id: true,
                      slug: true,
                      name: true,
                      description: true,
                      archetype: true,
                      profile: true,
                      scenario: true,
                      greeting: true,
                      tags: true,
                      assets: {
                        where: { type: "IMAGE", contentRating: { in: allowedRatings } },
                        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
                        take: 1,
                        select: { id: true, publicUrl: true, metadata: true, contentRating: true },
                      },
                    },
                  },
                },
              },
            }
          : {}),
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
        scenes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        sessions: {
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: {
            id: true,
            summary: true,
            updatedAt: true,
          },
        },
      },
    }),
    prisma.companion.findMany({
      where: {
        contentRating: { in: allowedRatings },
        OR: [
          { visibility: Visibility.PUBLIC },
          ...(user ? [{ ownerId: user.id }] : []),
        ],
      },
      orderBy: [
        { featuredRank: "asc" },
        { likes: "desc" },
        { createdAt: "desc" },
      ],
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        assets: {
          where: { type: "IMAGE", contentRating: { in: allowedRatings } },
          orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { id: true, publicUrl: true, metadata: true, contentRating: true },
        },
      },
    }),
    user
      ? prisma.rpCampaign.findMany({
          where: { userId: user.id },
          orderBy: { updatedAt: "desc" },
          take: 18,
          select: {
            id: true,
            title: true,
            genre: true,
            tone: true,
            status: true,
            updatedAt: true,
          },
        })
      : Promise.resolve([]),
  ]);

  if (!campaign) notFound();

  const campaignCharacters =
    "characters" in campaign && Array.isArray(campaign.characters)
      ? (campaign.characters as unknown as RpPageCharacter[])
      : [];
  const legacyCompanion =
    campaignCharacters.length === 0 && campaign.companionId
      ? await prisma.companion.findUnique({
          where: { id: campaign.companionId },
          select: {
            id: true,
            slug: true,
            name: true,
            description: true,
            archetype: true,
            profile: true,
            scenario: true,
            greeting: true,
            tags: true,
            assets: {
              where: { type: "IMAGE", contentRating: { in: allowedRatings } },
              orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
              take: 1,
              select: { id: true, publicUrl: true, metadata: true, contentRating: true },
            },
          },
        })
      : null;
  const castMembers = [
    ...campaignCharacters.map((character) => ({
      id: character.id,
      role: character.role,
      joinedAt: character.joinedAt.toISOString(),
      companion: character.companion,
    })),
    ...(legacyCompanion
      ? [
          {
            id: `legacy-${legacyCompanion.id}`,
            role: "primary",
            joinedAt: campaign.createdAt.toISOString(),
            companion: legacyCompanion,
          },
        ]
      : []),
  ];
  const selectedCompanionIds = new Set(
    castMembers.map((member) => member.companion.id),
  );

  return (
    <RpChatWorkspace
      campaignId={campaign.id}
      title={campaign.title}
      cast={castMembers.map((member) => {
        const asset = member.companion.assets[0];
        const assetMeta = (asset?.metadata ?? {}) as Record<string, unknown>;

        return {
          id: member.id,
          role: member.role,
          joinedAt: member.joinedAt,
          companion: {
            id: member.companion.id,
            slug: member.companion.slug,
            name: member.companion.name,
            description: member.companion.description,
            archetype: member.companion.archetype,
            profile: member.companion.profile,
            scenario: member.companion.scenario,
            greeting: member.companion.greeting,
            tags: member.companion.tags,
            imageUrl: asset
              ? asset.contentRating === ContentRating.ADULT
                ? `/media/${asset.id}`
                : (asset.publicUrl ?? `/media/${asset.id}`)
              : null,
            focalX: Number(assetMeta.focalX ?? 50),
            focalY: Number(assetMeta.focalY ?? 0),
          },
        };
      })}
      memory={{
        campaignTitle: campaign.title,
        genre: campaign.genre,
        tone: campaign.tone,
        sessionSummary: campaign.sessions[0]?.summary ?? null,
        latestSceneSummary: campaign.scenes[0]?.summary ?? null,
        messageCount: campaign.messages.length,
        lastActiveAt: campaign.sessions[0]?.updatedAt.toISOString() ?? campaign.updatedAt.toISOString(),
      }}
      storyPanel={
        <RpStoryList
          activeCampaignId={campaign.id}
          stories={storyList.map((story) => ({
            id: story.id,
            title: story.title,
            genre: story.genre,
            tone: story.tone,
            status: story.status,
            updatedAt: story.updatedAt.toISOString(),
          }))}
        />
      }
      companionPicker={
          <section className="rounded-2xl bg-black/30 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Add existing character
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Build a multi-character cast while keeping this same campaign id.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a
                  href="/companions/new?mode=rp"
                  className="inline-flex h-9 items-center rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/20"
                >
                  Create RP character
                </a>
                <a
                  href="/adult/companions/new?mode=rp"
                  className="inline-flex h-9 items-center rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 text-xs font-semibold text-rose-100 transition hover:bg-rose-500/20"
                >
                  Create adult RP character
                </a>
                <a
                  href="/companions"
                  className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Browse all
                </a>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {companionOptions.map((companion) => {
                const asset = companion.assets[0];
                const imageUrl = asset
                  ? asset.contentRating === ContentRating.ADULT
                    ? `/media/${asset.id}`
                    : (asset.publicUrl ?? `/media/${asset.id}`)
                  : null;
                const assetMeta = (asset?.metadata ?? {}) as Record<
                  string,
                  unknown
                >;
                const objectPos = `${assetMeta.focalX ?? 50}% ${assetMeta.focalY ?? 0}%`;

                return (
                  <div
                    key={companion.id}
                    className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]"
                  >
                    <div className="flex gap-3 p-3">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-900">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={`${companion.name} portrait`}
                            className="h-full w-full object-cover"
                            style={{ objectPosition: objectPos }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-600">
                            {companion.name.slice(0, 1)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-1 text-sm font-semibold text-white">
                          {companion.name}
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-400">
                          {companion.description}
                        </p>
                      </div>
                    </div>
                    <div className="border-t border-white/10 p-3">
                      {selectedCompanionIds.has(companion.id) ? (
                        <div className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-500/10 text-xs font-semibold text-emerald-100">
                          Already in cast
                        </div>
                      ) : (
                        <CreateRpCampaignButton
                          campaignId={campaign.id}
                          companionSlug={companion.slug}
                          className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Add to cast
                        </CreateRpCampaignButton>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {companionOptions.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                No existing characters are available. Create an RP character to add one.
              </div>
            ) : null}
          </section>
      }
      initialMessages={campaign.messages.map((message) => ({
        id: message.id,
        speakerType: message.speakerType,
        content: message.content,
        imageUrl: message.imageUrl,
        createdAt: message.createdAt.toISOString(),
      }))}
      initialScene={
        campaign.scenes[0]
          ? {
              id: campaign.scenes[0].id,
              title: campaign.scenes[0].title,
              location: campaign.scenes[0].location,
              mood: campaign.scenes[0].mood,
              imagePrompt: campaign.scenes[0].imagePrompt,
              imageUrl: campaign.scenes[0].imageUrl,
            }
          : null
      }
    />
  );
}
