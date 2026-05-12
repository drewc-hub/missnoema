import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { createPlanCheckout } from "@/lib/payments";

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
        supabaseUserId: true,
        stripeCustomerId: true,
      },
    });

    if (!appUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const origin = req.headers.get("origin") ?? "http://localhost:3000";

    const checkout = await createPlanCheckout({
      user: {
        id: appUser.id,
        email: appUser.email,
        supabaseUserId: appUser.supabaseUserId,
        stripeCustomerId: appUser.stripeCustomerId,
      },
      appUrl: origin,
      plan: "premium",
    });

    return NextResponse.json({
      url: checkout.url,
      provider: checkout.provider,
    });
  } catch (err) {
    console.error("POST /api/billing/checkout error", err);
    return NextResponse.json(
      { error: "Failed to create checkout session." },
      { status: 500 },
    );
  }
}
