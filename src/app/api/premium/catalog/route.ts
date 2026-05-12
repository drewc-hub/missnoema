import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { PREMIUM_CATALOG, getUserEntitlementsMap, hasPremiumFeature } from "@/lib/premium";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const entitlements = await getUserEntitlementsMap(user.id);
  const allowAdult = isAdultAllowed(user);

  const items = PREMIUM_CATALOG.map((item) => ({
    ...item,
    unlocked:
      item.kind === "unlock"
        ? hasPremiumFeature(entitlements, item.featureKey)
        : false,
    quantity:
      item.featureKey === "image_credits"
        ? (entitlements.get(item.featureKey)?.quantity ?? 0)
        : undefined,
    purchasable:
      !item.requiresAgeVerification || allowAdult,
  }));

  return NextResponse.json({ items });
}
