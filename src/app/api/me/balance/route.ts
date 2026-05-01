import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      coinBalance: true,
      subscriptionTier: true,
      subscriptionStatus: true,
    },
  });

  return NextResponse.json({
    coinBalance: dbUser?.coinBalance ?? 0,
    subscriptionTier: dbUser?.subscriptionTier ?? null,
    subscriptionStatus: dbUser?.subscriptionStatus ?? null,
  });
}
