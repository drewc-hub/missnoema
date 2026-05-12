import { Visibility } from "@prisma/client";

export type MarketplaceReadinessInput = {
  description: string;
  tags: string[];
  profile: unknown;
  assets: { id: string }[];
};

export type MarketplaceReadiness = {
  score: number;
  missing: string[];
  label: "Marketplace ready" | "Almost ready" | "Draft";
};

export function getMarketplaceReadiness(companion: MarketplaceReadinessInput): MarketplaceReadiness {
  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};

  const missing: string[] = [];
  if (companion.description.trim().length < 80) missing.push("Richer description");
  if (companion.tags.length < 3) missing.push("3+ tags");
  if (typeof profile.personality !== "string" || profile.personality.trim().length < 80) {
    missing.push("Personality");
  }
  if (typeof profile.scene !== "string" || profile.scene.trim().length < 20) {
    missing.push("Opening scene");
  }
  if (companion.assets.length === 0) missing.push("Cover image");

  const score = Math.max(0, 5 - missing.length);

  return {
    score,
    missing,
    label: score >= 5 ? "Marketplace ready" : score >= 3 ? "Almost ready" : "Draft",
  };
}

export function getMarketplaceState(visibility: Visibility) {
  if (visibility === Visibility.PUBLIC) {
    return {
      label: "Public listing",
      description: "Visible in marketplace, library, discovery, and public profile pages.",
      tone: "public" as const,
    };
  }

  if (visibility === Visibility.UNLISTED) {
    return {
      label: "Unlisted",
      description: "Shareable by direct link, but not shown in marketplace or discovery.",
      tone: "unlisted" as const,
    };
  }

  return {
    label: "Draft",
    description: "Private to you while you finish the companion profile and media.",
    tone: "draft" as const,
  };
}
