import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RpIndexPage() {
  const user = await getAuthedUser();

  if (user) {
    const latestCampaign = await prisma.rpCampaign.findFirst({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (latestCampaign) {
      redirect(`/rp/${latestCampaign.id}`);
    }
  }

  redirect("/roleplay");
}
