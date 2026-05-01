// src/app/api/stripe/webhook/route.ts
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const PRICE_TO_TIER: Record<string, "premium" | "premium_plus"> = {
  [process.env.STRIPE_PRICE_ID_PREMIUM!]: "premium",
  [process.env.STRIPE_PRICE_ID_PLUS!]: "premium_plus",
};

export async function POST(req: Request) {
  const body = await req.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return new NextResponse("Missing stripe-signature header", { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("Missing STRIPE_WEBHOOK_SECRET", { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        const paymentIntentId =
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : null;

        if (!userId) {
          console.warn("No userId in session metadata; skipping DB update");
          break;
        }

        if (session.metadata?.purchaseType === "coins") {
          const coins = parseInt(session.metadata.coins ?? "0", 10);
          const coinPack = session.metadata.coinPack ?? "unknown";

          if (!Number.isFinite(coins) || coins <= 0) {
            console.warn("Invalid coin amount:", session.metadata.coins);
            break;
          }

          const existing = await prisma.coinTransaction.findFirst({
            where: { stripeSessionId: session.id, kind: "purchase" },
            select: { id: true },
          });

          if (existing) {
            console.log("Coin purchase already credited:", session.id);
            break;
          }

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
                description: `Coin pack: ${coinPack} (${coins} coins)`,
                stripeSessionId: session.id,
                stripePaymentIntentId: paymentIntentId ?? undefined,
              },
            }),
          ]);

          console.log(`[webhook] Credited ${coins} coins to user ${userId}`);
          break;
        }

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : null;

        await prisma.user.update({
          where: { id: userId },
          data: {
            stripeCustomerId: customerId ?? undefined,
            stripeSubscriptionId: subscriptionId ?? undefined,
            subscriptionStatus: "active",
          },
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : null;
        const firstItem = subscription.items.data[0];
        const priceId = firstItem?.price?.id ?? null;
        const tier = priceId ? (PRICE_TO_TIER[priceId] ?? null) : null;

        if (!customerId) {
          console.warn("No customerId on subscription; skipping DB update");
          break;
        }

        await prisma.user.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            subscriptionPriceId: priceId,
            subscriptionTier: tier,
          },
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : null;

        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: {
              subscriptionStatus: "canceled",
              stripeSubscriptionId: subscription.id,
            },
          });
        }

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : null;

        if (customerId) {
          await prisma.user.updateMany({
            where: { stripeCustomerId: customerId },
            data: { subscriptionStatus: "past_due" },
          });
        }

        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error", error);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}
