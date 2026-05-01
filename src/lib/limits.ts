export type SubscriptionTier = "premium" | "premium_plus" | null;

export const LIMITS = {
  premium: {
    companions: 10,
    messages: 5000,
    images: 50,
    videos: 5,
  },
  premium_plus: {
    companions: 25,
    messages: Infinity,
    images: 200,
    videos: 25,
  },
} as const;

export function getLimits(tier: SubscriptionTier) {
  if (!tier) return null;
  return LIMITS[tier];
}
