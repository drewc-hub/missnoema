import { SubscriptionPlan } from "@prisma/client";

export const RP_ELIGIBLE_PLANS: SubscriptionPlan[] = [
  SubscriptionPlan.PRO,
  SubscriptionPlan.UNLIMITED,
];

export function isRpWorldEligible(plan: SubscriptionPlan) {
  return RP_ELIGIBLE_PLANS.includes(plan);
}

export function normalizeWorldSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}
