import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { createCoinCheckout, type CoinPackKey } from "@/lib/payments";

const VALID_PACKS: Record<CoinPackKey, true> = {
  coins_500: true,
  coins_1200: true,
  coins_2500: true,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const pack = body?.pack as CoinPackKey | undefined;

    if (!pack || !(pack in VALID_PACKS)) {
      return NextResponse.json(
        { error: "Invalid coin pack selected" },
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

    const checkout = await createCoinCheckout({
      user: {
        id: user.id,
        email: user.email ?? sbUser.email ?? null,
        supabaseUserId: user.supabaseUserId ?? sbUser.id,
        stripeCustomerId: user.stripeCustomerId,
      },
      appUrl,
      pack,
    });
    return NextResponse.json({ url: checkout.url, provider: checkout.provider });
  } catch (error) {
    console.error("Coin checkout route error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create coin checkout session",
      },
      { status: 500 },
    );
  }
}
