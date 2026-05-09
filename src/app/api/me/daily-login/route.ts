import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { calcLoginReward } from "@/lib/economy";

export const runtime = "nodejs";

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

  // Already claimed today
  if (dbUser.lastLoginRewardAt && dbUser.lastLoginRewardAt >= todayStart) {
    return NextResponse.json({
      alreadyClaimed: true,
      streak: dbUser.loginStreak,
      coins: 0,
      coinBalance: dbUser.coinBalance,
    });
  }

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);

  const claimedYesterday =
    dbUser.lastLoginRewardAt !== null &&
    dbUser.lastLoginRewardAt >= yesterdayStart;

  const newStreak = claimedYesterday ? dbUser.loginStreak + 1 : 1;
  const { total: coins, milestoneBonus, isMilestone } = calcLoginReward(dbUser.plan, newStreak);

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
        description: isMilestone
          ? `Day ${newStreak} streak milestone reward`
          : `Day ${newStreak} login streak reward`,
      },
    }),
  ]);

  return NextResponse.json({
    alreadyClaimed: false,
    streak: newStreak,
    coins,
    milestoneBonus,
    isMilestone,
    coinBalance: updatedUser.coinBalance,
    streakBroken: !claimedYesterday && dbUser.lastLoginRewardAt !== null,
  });
}
