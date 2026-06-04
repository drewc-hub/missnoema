import RpChatWorkspace from "@/components/rp/RpChatWorkspace";
import { prisma } from "@/lib/prisma";
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

  const campaign = await prisma.rpCampaign.findUnique({
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
  });

  if (!campaign) notFound();

  return (
    <RpChatWorkspace
      campaignId={campaign.id}
      title={campaign.title}
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
