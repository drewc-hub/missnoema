import "server-only";

import { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const PremiumFeature = {
  PREMIUM_COMPANIONS: "premium_companions",
  CUSTOM_PERSONAS: "custom_personas",
  MEMORY_EXPANSION: "memory_expansion",
  PRIVATE_COMPANIONS: "private_companions",
  CREATOR_MARKETPLACE: "creator_marketplace",
  PREMIUM_VOICES: "premium_voices",
  IMAGE_CREDITS: "image_credits",
  NSFW_UNLOCKS: "nsfw_unlocks",
  RELATIONSHIP_BOOST: "relationship_boost",
} as const;

export type PremiumFeatureKey =
  (typeof PremiumFeature)[keyof typeof PremiumFeature];

type PremiumSku = {
  sku: string;
  featureKey: PremiumFeatureKey;
  title: string;
  description: string;
  coinsCost: number;
  grantQuantity: number;
  kind: "unlock" | "consumable";
  requiresAgeVerification?: boolean;
};

export const PREMIUM_CATALOG: PremiumSku[] = [
  {
    sku: "premium_companions_pass",
    featureKey: PremiumFeature.PREMIUM_COMPANIONS,
    title: "Premium Companions Pass",
    description: "Unlock access to premium-only companions.",
    coinsCost: 1200,
    grantQuantity: 1,
    kind: "unlock",
  },
  {
    sku: "custom_personas_unlock",
    featureKey: PremiumFeature.CUSTOM_PERSONAS,
    title: "Custom Personas",
    description: "Create your own persona companions.",
    coinsCost: 900,
    grantQuantity: 1,
    kind: "unlock",
  },
  {
    sku: "memory_expansion_unlock",
    featureKey: PremiumFeature.MEMORY_EXPANSION,
    title: "Memory Expansion",
    description: "Increase chat memory context and continuity depth.",
    coinsCost: 700,
    grantQuantity: 1,
    kind: "unlock",
  },
  {
    sku: "private_companions_unlock",
    featureKey: PremiumFeature.PRIVATE_COMPANIONS,
    title: "Private Companions",
    description: "Set companions to private visibility.",
    coinsCost: 600,
    grantQuantity: 1,
    kind: "unlock",
  },
  {
    sku: "creator_marketplace_unlock",
    featureKey: PremiumFeature.CREATOR_MARKETPLACE,
    title: "Creator Marketplace",
    description: "List your companions in the public creator marketplace.",
    coinsCost: 800,
    grantQuantity: 1,
    kind: "unlock",
  },
  {
    sku: "premium_voices_unlock",
    featureKey: PremiumFeature.PREMIUM_VOICES,
    title: "Premium Voices",
    description: "Use premium voice style and accent metadata.",
    coinsCost: 500,
    grantQuantity: 1,
    kind: "unlock",
  },
  {
    sku: "nsfw_unlock_pass",
    featureKey: PremiumFeature.NSFW_UNLOCKS,
    title: "NSFW Unlock",
    description: "Unlock adult companion interactions (age verification still required).",
    coinsCost: 1000,
    grantQuantity: 1,
    kind: "unlock",
    requiresAgeVerification: true,
  },
  {
    sku: "relationship_boost_unlock",
    featureKey: PremiumFeature.RELATIONSHIP_BOOST,
    title: "Relationship Progression Boost",
    description: "Increase relationship growth gain in chat.",
    coinsCost: 850,
    grantQuantity: 1,
    kind: "unlock",
  },
  {
    sku: "image_credits_100",
    featureKey: PremiumFeature.IMAGE_CREDITS,
    title: "Image Credits x100",
    description: "Adds 100 image generation credits.",
    coinsCost: 300,
    grantQuantity: 100,
    kind: "consumable",
  },
  {
    sku: "image_credits_300",
    featureKey: PremiumFeature.IMAGE_CREDITS,
    title: "Image Credits x300",
    description: "Adds 300 image generation credits.",
    coinsCost: 800,
    grantQuantity: 300,
    kind: "consumable",
  },
];

export function findPremiumSku(sku: string) {
  return PREMIUM_CATALOG.find((item) => item.sku === sku) ?? null;
}

export function hasPremiumFeature(
  entitlementsByKey: Map<string, { isActive: boolean; quantity: number; expiresAt: Date | null }>,
  feature: PremiumFeatureKey,
) {
  const item = entitlementsByKey.get(feature);
  if (!item || !item.isActive) return false;
  if (item.expiresAt && item.expiresAt.getTime() < Date.now()) return false;
  return item.quantity > 0;
}

export async function getUserEntitlementsMap(userId: string) {
  const rows = await prisma.userEntitlement.findMany({
    where: { userId },
    select: {
      featureKey: true,
      quantity: true,
      isActive: true,
      expiresAt: true,
    },
  });
  return new Map(
    rows.map((row) => [
      row.featureKey,
      {
        quantity: row.quantity,
        isActive: row.isActive,
        expiresAt: row.expiresAt,
      },
    ]),
  );
}

export async function hasUserFeature(userId: string, feature: PremiumFeatureKey) {
  const entitlements = await getUserEntitlementsMap(userId);
  return hasPremiumFeature(entitlements, feature);
}

export async function consumeImageCreditIfAvailable(userId: string) {
  const row = await prisma.userEntitlement.findUnique({
    where: {
      userId_featureKey: {
        userId,
        featureKey: PremiumFeature.IMAGE_CREDITS,
      },
    },
    select: {
      quantity: true,
      isActive: true,
      expiresAt: true,
    },
  });

  if (!row || !row.isActive || row.quantity <= 0) return false;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return false;

  const updated = await prisma.userEntitlement.updateMany({
    where: {
      userId,
      featureKey: PremiumFeature.IMAGE_CREDITS,
      isActive: true,
      quantity: { gt: 0 },
    },
    data: {
      quantity: { decrement: 1 },
    },
  });

  return updated.count > 0;
}

export function additionalMemoryWindowForPlan(
  plan: SubscriptionPlan,
  hasMemoryExpansion: boolean,
) {
  const planBonus = plan === SubscriptionPlan.UNLIMITED ? 8 : plan === SubscriptionPlan.PRO ? 4 : 0;
  const entitlementBonus = hasMemoryExpansion ? 20 : 0;
  return planBonus + entitlementBonus;
}

export function relationshipBoostMultiplier(hasBoost: boolean) {
  return hasBoost ? 1.5 : 1;
}

export function isPremiumOnlyProfile(profile: unknown) {
  return (
    !!profile &&
    typeof profile === "object" &&
    (profile as Record<string, unknown>).premiumOnly === true
  );
}
