import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubscriptionPlan } from "@prisma/client";

export const runtime = "nodejs";

const BASE_COINS: Record<SubscriptionPlan, number> = {
  BASIC: 5,
  PRO: 10,
  UNLIMITED: 20,
};

function calcReward(plan: SubscriptionPlan, streak: number): number {
  const base = BASE_COINS[plan];
  if (streak >= 30) return base * 5;
  if (streak >= 14) return base * 3;
  if (streak >= 7)  return base * 2;
  if (streak >= 3)  return base + 5;
  return base;
}

export async function POST() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, plan: true, loginStreak: true, lastLoginRewardAt: true, coinBalance: true },
  });
  if (!dbUser) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // Already claimed today — return current streak, no coins
  if (dbUser.lastLoginRewardAt && dbUser.lastLoginRewardAt >= todayStart) {
    return NextResponse.json({
      alreadyClaimed: true,
      streak: dbUser.loginStreak,
      coins: 0,
      coinBalance: dbUser.coinBalance,
    });
  }

  // Determine streak: claimed yesterday = extend, otherwise reset
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const claimedYesterday =
    dbUser.lastLoginRewardAt !== null &&
    dbUser.lastLoginRewardAt >= yesterdayStart;

  const newStreak = claimedYesterday ? dbUser.loginStreak + 1 : 1;
  const coins = calcReward(dbUser.plan, newStreak);

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: dbUser.id },
      data: {
        coinBalance: { increment: coins },
        loginStreak: newStreak,
        lastLoginRewardAt: now,
      },
      select: { coinBalance: true },
    }),
    prisma.coinTransaction.create({
      data: {
        userId: dbUser.id,
        amount: coins,
        kind: "daily_login",
        description: `Day ${newStreak} login streak reward`,
      },
    }),
  ]);

  return NextResponse.json({
    alreadyClaimed: false,
    streak: newStreak,
    coins,
    coinBalance: updatedUser.coinBalance,
    streakBroken: !claimedYesterday && dbUser.lastLoginRewardAt !== null,
  });
}
