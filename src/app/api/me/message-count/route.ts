import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, DAILY_MESSAGE_LIMITS } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const dailyLimit = DAILY_MESSAGE_LIMITS[user.plan];

  if (dailyLimit === null) {
    return NextResponse.json({ used: null, limit: null, plan: user.plan });
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const used = await prisma.chatMessage.count({
    where: {
      role: "user",
      createdAt: { gte: startOfDay },
      conversation: { userId: user.id },
    },
  });

  return NextResponse.json({ used, limit: dailyLimit, plan: user.plan });
}
