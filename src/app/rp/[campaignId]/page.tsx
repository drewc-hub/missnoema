import RpChatWorkspace from "@/components/rp/RpChatWorkspace";
import CreateRpCampaignButton from "@/components/rp/CreateRpCampaignButton";
import { prisma } from "@/lib/prisma";
import { ContentRating, Visibility } from "@prisma/client";
import { notFound } from "next/navigation";

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

  const [campaign, companionOptions] = await Promise.all([
    prisma.rpCampaign.findUnique({
      where: { id: safeCampaignId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50,
        },
        scenes: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
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
      take: 6,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        assets: {
          where: { type: "IMAGE", contentRating: ContentRating.SAFE },
          orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: { id: true, publicUrl: true, metadata: true },
        },
      },
    }),
  ]);

  if (!campaign) notFound();

  return (
    <RpChatWorkspace
      campaignId={campaign.id}
      title={campaign.title}
      companionPicker={
        campaign.companionId ? null : (
          <section className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Add a companion to this campaign
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Pick a character and keep using this same campaign id.
                </p>
              </div>
              <a
                href="/roleplay"
                className="text-sm font-semibold text-blue-300 transition hover:text-blue-200"
              >
                Browse more
              </a>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {companionOptions.map((companion) => {
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
                      <CreateRpCampaignButton
                        campaignId={campaign.id}
                        companionSlug={companion.slug}
                        className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-blue-500 text-xs font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Insert companion
                      </CreateRpCampaignButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )
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
