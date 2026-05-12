import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const PLAN_TO_SUBSCRIPTION: Record<string, { tier: string; plan: SubscriptionPlan }> = {
  premium: { tier: "premium", plan: SubscriptionPlan.PRO },
  premium_plus: { tier: "premium_plus", plan: SubscriptionPlan.UNLIMITED },
};

const COIN_PACK_TO_AMOUNT: Record<string, number> = {
  coins_500: 500,
  coins_1200: 1200,
  coins_2500: 2500,
};

function firstValue(
  source: Record<string, string>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function parseCustomVariable(raw: string) {
  if (!raw) return {};
  const out: Record<string, string> = {};
  const normalized = raw.includes("&") ? raw : raw.replace(/\|/g, "&").replace(/;/g, "&");
  for (const pair of normalized.split("&")) {
    const [k, v] = pair.split("=");
    if (k && v) {
      try {
        out[k.trim()] = decodeURIComponent(v.trim());
      } catch {
        out[k.trim()] = v.trim();
      }
    }
  }
  return out;
}

async function collectPayload(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const text = await req.text();
  const fromBody: Record<string, string> = {};

  if (text) {
    if (contentType.includes("application/json")) {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          fromBody[key] = String(value);
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
          const nested = value as Record<string, unknown>;
          for (const [k, v] of Object.entries(nested)) {
            if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
              fromBody[k] = String(v);
              fromBody[`${key}.${k}`] = String(v);
            }
          }
        }
      }
    } else {
      const form = new URLSearchParams(text);
      for (const [key, value] of form.entries()) fromBody[key] = value;
    }
  }

  const url = new URL(req.url);
  const fromQuery: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    fromQuery[key] = value;
  }

  return { ...fromQuery, ...fromBody };
}

function successReply(payload: Record<string, string>) {
  const isSegpayLike =
    !!payload.action ||
    payload.source === "segpay" ||
    payload.provider === "segpay";
  if (isSegpayLike) {
    return new Response("GOOD", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  let payload: Record<string, string>;
  try {
    payload = await collectPayload(req);
  } catch (error) {
    console.error("Payment webhook payload parse failed:", error);
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  const headerSecret = req.headers.get("x-payment-webhook-secret") ?? "";
  const providedSecret = firstValue(payload, "secret") || headerSecret;
  const expectedSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (expectedSecret && providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized webhook." }, { status: 401 });
  }

  const customVariable = firstValue(payload, "customvariable", "customVariable", "userdata");
  const custom = parseCustomVariable(customVariable);

  const userId =
    firstValue(payload, "userId", "app_uid", "uid", "memberID", "memberId") ||
    firstValue(custom, "uid", "userId", "memberID", "memberId");

  if (!userId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  const action = firstValue(payload, "action", "eventType", "event", "type").toLowerCase();
  const purchaseType =
    firstValue(payload, "purchaseType", "app_type", "productType").toLowerCase() ||
    firstValue(custom, "purchaseType", "type").toLowerCase();

  const item =
    firstValue(payload, "coinPack", "pack", "plan", "purchase", "app_item", "sku").toLowerCase() ||
    firstValue(custom, "coinPack", "pack", "plan", "purchase", "item").toLowerCase();

  const externalId =
    firstValue(
      payload,
      "transactionId",
      "tranid",
      "purchaseid",
      "eventId",
      "orderId",
      "invoiceId",
      "sessionId",
    ) || createHash("sha1").update(JSON.stringify(payload)).digest("hex");
  const ledgerRef = `ext:${externalId}`;

  const isCoinPurchase =
    purchaseType === "coins" ||
    item in COIN_PACK_TO_AMOUNT ||
    !!firstValue(payload, "coins", "amountCoins");

  if (isCoinPurchase) {
    const explicitCoins = Number(firstValue(payload, "coins", "amountCoins"));
    const coins = Number.isFinite(explicitCoins) && explicitCoins > 0
      ? Math.floor(explicitCoins)
      : (COIN_PACK_TO_AMOUNT[item] ?? 0);

    if (coins <= 0) {
      return NextResponse.json({ error: "Could not determine coin amount." }, { status: 400 });
    }

    const existing = await prisma.coinTransaction.findFirst({
      where: { stripeSessionId: ledgerRef, kind: "purchase" },
      select: { id: true },
    });

    if (!existing) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { coinBalance: { increment: coins } },
        }),
        prisma.coinTransaction.create({
          data: {
            userId,
            amount: coins,
            kind: "purchase",
            description: `External payment credit (${item || "coins"})`,
            stripeSessionId: ledgerRef,
            stripePaymentIntentId: firstValue(payload, "paymentIntentId", "payid") || undefined,
          },
        }),
      ]);
    }

    return successReply(payload);
  }

  const planKey =
    firstValue(payload, "plan", "tier", "app_item", "purchase").toLowerCase() ||
    firstValue(custom, "plan", "tier").toLowerCase();
  const canceled =
    action.includes("cancel") ||
    action.includes("disable") ||
    action.includes("deleted");

  const mapped = PLAN_TO_SUBSCRIPTION[planKey];
  if (!mapped && !canceled) {
    return NextResponse.json({ error: "Could not determine plan." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: userId },
    data: canceled
      ? {
          subscriptionStatus: "canceled",
        }
      : {
          subscriptionStatus: "active",
          subscriptionTier: mapped!.tier,
          plan: mapped!.plan,
          subscriptionPriceId: planKey,
        },
  });

  return successReply(payload);
}
