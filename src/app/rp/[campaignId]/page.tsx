import RpChatWorkspace from "@/components/rp/RpChatWorkspace";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function RpCampaignPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;

  const campaign = await prisma.rpCampaign.findUnique({
    where: { id: campaignId },
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
      initialMessages={campaign.messages}
      initialScene={campaign.scenes[0] ?? null}
    />
  );
}
