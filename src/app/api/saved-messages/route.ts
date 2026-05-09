import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

const SAVE_LIMITS: Record<string, number | null> = {
  BASIC: 10,
  PRO: 50,
  UNLIMITED: null,
};

export const COIN_COST_PER_SAVE = 5;

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, coinBalance: true },
  });

  const plan = dbUser?.plan ?? "BASIC";
  const limit = SAVE_LIMITS[plan] ?? SAVE_LIMITS.BASIC!;

  const total = await prisma.savedMessage.count({ where: { userId: user.id } });

  // If a conversationId is given, return which messageIds in that conversation are saved
  let ids: string[] = [];
  if (conversationId) {
    const msgs = await prisma.chatMessage.findMany({
      where: { conversationId },
      select: { id: true },
    });
    const msgIds = msgs.map((m) => m.id);
    const saved = await prisma.savedMessage.findMany({
      where: { userId: user.id, messageId: { in: msgIds } },
      select: { messageId: true },
    });
    ids = saved.map((s) => s.messageId).filter(Boolean) as string[];
  }

  return NextResponse.json({
    ids,
    total,
    limit,
    coinBalance: dbUser?.coinBalance ?? 0,
    coinCost: COIN_COST_PER_SAVE,
  });
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const { messageId, content, companionId, companionName, useCoin } = body ?? {};

  if (!messageId || !content || !companionId || !companionName) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  // Toggle: if already saved, unsave it
  const existing = await prisma.savedMessage.findFirst({
    where: { userId: user.id, messageId },
  });
  if (existing) {
    await prisma.savedMessage.delete({ where: { id: existing.id } });
    return NextResponse.json({ ok: true, saved: false });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, coinBalance: true },
  });

  const plan = dbUser?.plan ?? "BASIC";
  const limit = SAVE_LIMITS[plan] ?? SAVE_LIMITS.BASIC!;
  const total = await prisma.savedMessage.count({ where: { userId: user.id } });

  if (limit !== null && total >= limit) {
    if (!useCoin) {
      return NextResponse.json({
        ok: false,
        limitReached: true,
        limit,
        total,
        coinCost: COIN_COST_PER_SAVE,
        coinBalance: dbUser?.coinBalance ?? 0,
      });
    }

    // Spend coins
    const balance = dbUser?.coinBalance ?? 0;
    if (balance < COIN_COST_PER_SAVE) {
      return NextResponse.json({ error: "Not enough coins." }, { status: 402 });
    }

    await prisma.$transaction(async (tx) => {
      const deducted = await tx.user.updateMany({
        where: { id: user.id, coinBalance: { gte: COIN_COST_PER_SAVE } },
        data: { coinBalance: { decrement: COIN_COST_PER_SAVE } },
      });
      if (deducted.count === 0) throw new Error("insufficient_coins");
      await tx.coinTransaction.create({
        data: {
          userId: user.id,
          amount: -COIN_COST_PER_SAVE,
          kind: "save_message",
          description: `Saved a message from ${companionName}`,
        },
      });
      await tx.savedMessage.create({
        data: { userId: user.id, messageId, content, companionId, companionName, coinPurchased: true },
      });
    });

    const updated = await prisma.user.findUnique({ where: { id: user.id }, select: { coinBalance: true } });
    return NextResponse.json({ ok: true, saved: true, coinPurchased: true, newCoinBalance: updated?.coinBalance ?? 0 });
  }

  await prisma.savedMessage.create({
    data: { userId: user.id, messageId, content, companionId, companionName },
  });

  return NextResponse.json({ ok: true, saved: true });
}
