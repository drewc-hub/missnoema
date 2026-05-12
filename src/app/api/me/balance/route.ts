import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { PremiumFeature } from "@/lib/premium";

export async function GET() {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      coinBalance: true,
      plan: true,
      subscriptionTier: true,
      subscriptionStatus: true,
    },
  });

  const imageCredits = await prisma.userEntitlement.findUnique({
    where: {
      userId_featureKey: {
        userId: user.id,
        featureKey: PremiumFeature.IMAGE_CREDITS,
      },
    },
    select: { quantity: true, isActive: true, expiresAt: true },
  });

  return NextResponse.json({
    coinBalance: dbUser?.coinBalance ?? 0,
    plan: dbUser?.plan ?? null,
    subscriptionTier: dbUser?.subscriptionTier ?? null,
    subscriptionStatus: dbUser?.subscriptionStatus ?? null,
    imageCredits:
      imageCredits && imageCredits.isActive &&
      (!imageCredits.expiresAt || imageCredits.expiresAt.getTime() >= Date.now())
        ? imageCredits.quantity
        : 0,
  });
}
