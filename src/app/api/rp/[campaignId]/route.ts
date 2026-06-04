import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const { campaignId } = await context.params;
    const safeCampaignId = String(campaignId ?? "").trim();
    const user = await getAuthedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!safeCampaignId || safeCampaignId.startsWith("[")) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    const campaign = await prisma.rpCampaign.findFirst({
      where: {
        id: safeCampaignId,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    await prisma.rpCampaign.delete({
      where: { id: campaign.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("RP campaign delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete roleplay campaign" },
      { status: 500 },
    );
  }
}
