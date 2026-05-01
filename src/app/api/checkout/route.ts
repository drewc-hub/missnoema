import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

type PlanKey = "premium" | "premium_plus";

const PLAN_TO_PRICE_ID: Record<PlanKey, string | undefined> = {
  premium: process.env.STRIPE_PRICE_ID_PREMIUM,
  premium_plus: process.env.STRIPE_PRICE_ID_PLUS,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const plan = body?.plan as PlanKey | undefined;

    if (!plan || !(plan in PLAN_TO_PRICE_ID)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 },
      );
    }

    const priceId = PLAN_TO_PRICE_ID[plan];
    if (!priceId) {
      return NextResponse.json(
        { error: `Missing Stripe price for plan: ${plan}` },
        { status: 500 },
      );
    }

    const supabase = await createSupabaseServerClientReadOnly();

    const {
      data: { user: sbUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !sbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: sbUser.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
        subscriptionStatus: true,
        subscriptionPriceId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? sbUser.email ?? undefined,
        metadata: {
          userId: user.id,
          supabaseUserId: sbUser.id,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: user.id },
        data: {
          stripeCustomerId,
        },
      });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/account/billing?checkout=success`,
      cancel_url: `${appUrl}/account/billing?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: {
        userId: user.id,
        supabaseUserId: sbUser.id,
        plan,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          supabaseUserId: sbUser.id,
          plan,
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create checkout session",
      },
      { status: 500 },
    );
  }
}
