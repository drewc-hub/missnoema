import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        stripeCustomerId: true,
      },
    });

    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let stripeCustomerId = appUser.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getStripe().customers.create({
        email: appUser.email ?? undefined,
        metadata: {
          userId: appUser.id,
        },
      });

      stripeCustomerId = customer.id;

      await prisma.user.update({
        where: { id: appUser.id },
        data: {
          stripeCustomerId,
        },
      });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_PRO_MONTHLY!,
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing/cancelled`,
      metadata: {
        userId: appUser.id,
      },
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (err) {
    console.error("POST /api/billing/checkout error", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 },
    );
  }
}
