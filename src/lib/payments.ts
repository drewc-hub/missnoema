import "server-only";

import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export type PlanKey = "premium" | "premium_plus";
export type CoinPackKey = "coins_500" | "coins_1200" | "coins_2500";
export type PaymentProvider = "external_links" | "stripe";

type CheckoutUser = {
  id: string;
  email: string | null;
  supabaseUserId?: string | null;
  stripeCustomerId?: string | null;
};

const PLAN_CONFIG: Record<PlanKey, { stripePriceId?: string; externalUrl?: string }> = {
  premium: {
    stripePriceId: process.env.STRIPE_PRICE_ID_PREMIUM,
    externalUrl: process.env.PAYMENT_LINK_PLAN_PREMIUM,
  },
  premium_plus: {
    stripePriceId: process.env.STRIPE_PRICE_ID_PLUS,
    externalUrl: process.env.PAYMENT_LINK_PLAN_PREMIUM_PLUS,
  },
};

const COIN_PACK_CONFIG: Record<CoinPackKey, { coins: number; stripePriceId?: string; externalUrl?: string }> = {
  coins_500: {
    coins: 500,
    stripePriceId: process.env.STRIPE_PRICE_ID_COINS_500,
    externalUrl: process.env.PAYMENT_LINK_COINS_500,
  },
  coins_1200: {
    coins: 1200,
    stripePriceId: process.env.STRIPE_PRICE_ID_COINS_1200,
    externalUrl: process.env.PAYMENT_LINK_COINS_1200,
  },
  coins_2500: {
    coins: 2500,
    stripePriceId: process.env.STRIPE_PRICE_ID_COINS_2500,
    externalUrl: process.env.PAYMENT_LINK_COINS_2500,
  },
};

function providerFromEnv(): PaymentProvider {
  const raw = (process.env.PAYMENT_PROVIDER ?? "external_links").toLowerCase();
  return raw === "stripe" ? "stripe" : "external_links";
}

function withParam(url: URL, key: string | undefined, value: string) {
  if (!key || !key.trim()) return;
  url.searchParams.set(key.trim(), value);
}

function buildSignature(parts: string[]) {
  const secret = process.env.PAYMENT_LINK_SIGNING_SECRET;
  if (!secret) return null;
  return createHmac("sha256", secret).update(parts.join(":")).digest("hex");
}

function buildExternalCheckoutUrl(args: {
  baseUrl: string;
  user: CheckoutUser;
  appUrl: string;
  purchaseType: "plan" | "coins";
  plan?: PlanKey;
  coinPack?: CoinPackKey;
}) {
  const { baseUrl, user, appUrl, purchaseType, plan, coinPack } = args;
  const url = new URL(baseUrl);
  const successUrl =
    purchaseType === "plan"
      ? `${appUrl}/account/billing?checkout=success`
      : `${appUrl}/account/billing?coins=success`;
  const cancelUrl =
    purchaseType === "plan"
      ? `${appUrl}/account/billing?checkout=cancelled`
      : `${appUrl}/account/billing?coins=cancelled`;

  const purchaseCode = purchaseType === "plan" ? (plan ?? "") : (coinPack ?? "");
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = buildSignature([user.id, purchaseType, purchaseCode, ts]);

  withParam(url, process.env.PAYMENT_USER_ID_PARAM ?? "memberID", user.id);
  if (user.email) {
    withParam(url, process.env.PAYMENT_EMAIL_PARAM ?? "x-billemail", user.email);
  }
  withParam(url, process.env.PAYMENT_PURCHASE_PARAM ?? "purchase", purchaseCode);
  withParam(url, process.env.PAYMENT_TYPE_PARAM ?? "purchaseType", purchaseType);
  withParam(url, process.env.PAYMENT_SUCCESS_URL_PARAM, successUrl);
  withParam(url, process.env.PAYMENT_CANCEL_URL_PARAM, cancelUrl);

  // Always include app metadata so postbacks can reconcile purchases.
  url.searchParams.set("app_uid", user.id);
  url.searchParams.set("app_type", purchaseType);
  url.searchParams.set("app_item", purchaseCode);
  url.searchParams.set("app_ts", ts);
  if (sig) url.searchParams.set("app_sig", sig);

  return url.toString();
}

async function ensureStripeCustomerId(user: CheckoutUser) {
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const customer = await getStripe().customers.create({
    email: user.email ?? undefined,
    metadata: {
      userId: user.id,
      supabaseUserId: user.supabaseUserId ?? "",
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function createPlanCheckout(args: {
  user: CheckoutUser;
  appUrl: string;
  plan: PlanKey;
}) {
  const provider = providerFromEnv();
  const selected = PLAN_CONFIG[args.plan];
  if (!selected) throw new Error("Invalid plan selected");

  if (provider === "stripe") {
    if (!selected.stripePriceId) {
      throw new Error(`Missing Stripe price for plan: ${args.plan}`);
    }
    const stripeCustomerId = await ensureStripeCustomerId(args.user);
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: selected.stripePriceId, quantity: 1 }],
      success_url: `${args.appUrl}/account/billing?checkout=success`,
      cancel_url: `${args.appUrl}/account/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        userId: args.user.id,
        supabaseUserId: args.user.supabaseUserId ?? "",
        plan: args.plan,
      },
      subscription_data: {
        metadata: {
          userId: args.user.id,
          supabaseUserId: args.user.supabaseUserId ?? "",
          plan: args.plan,
        },
      },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url, provider };
  }

  if (!selected.externalUrl) {
    throw new Error(`Missing external payment link for plan: ${args.plan}`);
  }
  const url = buildExternalCheckoutUrl({
    baseUrl: selected.externalUrl,
    user: args.user,
    appUrl: args.appUrl,
    purchaseType: "plan",
    plan: args.plan,
  });
  return { url, provider };
}

export async function createCoinCheckout(args: {
  user: CheckoutUser;
  appUrl: string;
  pack: CoinPackKey;
}) {
  const provider = providerFromEnv();
  const selected = COIN_PACK_CONFIG[args.pack];
  if (!selected) throw new Error("Invalid coin pack selected");

  if (provider === "stripe") {
    if (!selected.stripePriceId) {
      throw new Error(`Missing Stripe price for pack: ${args.pack}`);
    }
    const stripeCustomerId = await ensureStripeCustomerId(args.user);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer: stripeCustomerId,
      line_items: [{ price: selected.stripePriceId, quantity: 1 }],
      success_url: `${args.appUrl}/account/billing?coins=success`,
      cancel_url: `${args.appUrl}/account/billing?coins=cancelled`,
      metadata: {
        userId: args.user.id,
        supabaseUserId: args.user.supabaseUserId ?? "",
        purchaseType: "coins",
        coinPack: args.pack,
        coins: String(selected.coins),
      },
    });
    if (!session.url) throw new Error("Stripe did not return a checkout URL");
    return { url: session.url, provider };
  }

  if (!selected.externalUrl) {
    throw new Error(`Missing external payment link for pack: ${args.pack}`);
  }
  const url = buildExternalCheckoutUrl({
    baseUrl: selected.externalUrl,
    user: args.user,
    appUrl: args.appUrl,
    purchaseType: "coins",
    coinPack: args.pack,
  });
  return { url, provider };
}
