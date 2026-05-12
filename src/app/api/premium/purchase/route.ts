import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { findPremiumSku } from "@/lib/premium";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

const BodySchema = z.object({
  sku: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }
  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid purchase payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const sku = findPremiumSku(parsed.data.sku);
  if (!sku) {
    return NextResponse.json({ error: "Unknown premium item." }, { status: 404 });
  }
  if (sku.requiresAgeVerification && !isAdultAllowed(user)) {
    return NextResponse.json(
      { error: "Age verification required for this premium unlock." },
      { status: 403 },
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    if (sku.kind === "unlock") {
      const existingUnlock = await tx.userEntitlement.findUnique({
        where: {
          userId_featureKey: {
            userId: user.id,
            featureKey: sku.featureKey,
          },
        },
        select: { isActive: true, quantity: true, expiresAt: true },
      });
      if (
        existingUnlock &&
        existingUnlock.isActive &&
        existingUnlock.quantity > 0 &&
        (!existingUnlock.expiresAt || existingUnlock.expiresAt.getTime() >= Date.now())
      ) {
        return { error: "Already unlocked.", status: 409 as const };
      }
    }

    const dbUser = await tx.user.findUnique({
      where: { id: user.id },
      select: { coinBalance: true },
    });

    if (!dbUser || dbUser.coinBalance < sku.coinsCost) {
      return { error: "Not enough coins.", status: 402 as const };
    }

    const deducted = await tx.user.updateMany({
      where: { id: user.id, coinBalance: { gte: sku.coinsCost } },
      data: { coinBalance: { decrement: sku.coinsCost } },
    });
    if (deducted.count === 0) {
      return { error: "Not enough coins.", status: 402 as const };
    }

    await tx.coinTransaction.create({
      data: {
        userId: user.id,
        amount: -sku.coinsCost,
        kind: "premium_purchase",
        description: `Premium purchase: ${sku.title}`,
      },
    });

    if (sku.kind === "unlock") {
      await tx.userEntitlement.upsert({
        where: {
          userId_featureKey: {
            userId: user.id,
            featureKey: sku.featureKey,
          },
        },
        create: {
          userId: user.id,
          featureKey: sku.featureKey,
          quantity: 1,
          isActive: true,
          metadata: {
            sku: sku.sku,
            kind: sku.kind,
          },
        },
        update: {
          quantity: 1,
          isActive: true,
          metadata: {
            sku: sku.sku,
            kind: sku.kind,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    } else {
      await tx.userEntitlement.upsert({
        where: {
          userId_featureKey: {
            userId: user.id,
            featureKey: sku.featureKey,
          },
        },
        create: {
          userId: user.id,
          featureKey: sku.featureKey,
          quantity: sku.grantQuantity,
          isActive: true,
          metadata: {
            sku: sku.sku,
            kind: sku.kind,
          },
        },
        update: {
          quantity: { increment: sku.grantQuantity },
          isActive: true,
          metadata: {
            sku: sku.sku,
            kind: sku.kind,
            updatedAt: new Date().toISOString(),
          },
        },
      });
    }

    await tx.premiumPurchase.create({
      data: {
        userId: user.id,
        sku: sku.sku,
        featureKey: sku.featureKey,
        coinsSpent: sku.coinsCost,
        quantity: sku.grantQuantity,
        metadata: {
          title: sku.title,
          kind: sku.kind,
        },
      },
    });

    const updatedUser = await tx.user.findUnique({
      where: { id: user.id },
      select: { coinBalance: true },
    });

    const entitlement = await tx.userEntitlement.findUnique({
      where: {
        userId_featureKey: {
          userId: user.id,
          featureKey: sku.featureKey,
        },
      },
      select: {
        featureKey: true,
        quantity: true,
        isActive: true,
        expiresAt: true,
      },
    });

    return {
      ok: true as const,
      sku: sku.sku,
      newCoinBalance: updatedUser?.coinBalance ?? 0,
      entitlement,
    };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
