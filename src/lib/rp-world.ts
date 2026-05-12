import { SubscriptionPlan } from "@prisma/client";
import { randomBytes } from "crypto";

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

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8) {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i += 1) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}
