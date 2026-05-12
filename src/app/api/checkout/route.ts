import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { createPlanCheckout, type PlanKey } from "@/lib/payments";

const VALID_PLANS: Record<PlanKey, true> = {
  premium: true,
  premium_plus: true,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const plan = body?.plan as PlanKey | undefined;

    if (!plan || !(plan in VALID_PLANS)) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 },
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
        supabaseUserId: true,
        stripeCustomerId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const checkout = await createPlanCheckout({
      user: {
        id: user.id,
        email: user.email ?? sbUser.email ?? null,
        supabaseUserId: user.supabaseUserId ?? sbUser.id,
        stripeCustomerId: user.stripeCustomerId,
      },
      appUrl,
      plan,
    });
    return NextResponse.json({ url: checkout.url, provider: checkout.provider });
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
