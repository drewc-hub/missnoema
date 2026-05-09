import { SubscriptionPlan } from "@prisma/client";

// Seconds a user must wait between generation jobs (0 = no cooldown)
export const GENERATION_COOLDOWN_SECONDS: Record<SubscriptionPlan, number> = {
  BASIC: 180,
  PRO: 30,
  UNLIMITED: 0,
};

// Max generation jobs per calendar day (null = unlimited)
export const DAILY_GENERATION_LIMITS: Record<SubscriptionPlan, number | null> = {
  BASIC: 5,
  PRO: 30,
  UNLIMITED: null,
};

// Base daily-login coin grant per plan
export const DAILY_LOGIN_BASE_COINS: Record<SubscriptionPlan, number> = {
  BASIC: 5,
  PRO: 15,
  UNLIMITED: 30,
};

// One-time bonus awarded exactly on these streak days (on top of base reward)
export const STREAK_MILESTONE_BONUSES: Record<number, number> = {
  3: 20,
  7: 50,
  14: 100,
  30: 200,
};

export type LoginRewardBreakdown = {
  base: number;
  milestoneBonus: number;
  total: number;
  isMilestone: boolean;
};

export function calcLoginReward(
  plan: SubscriptionPlan,
  streak: number,
): LoginRewardBreakdown {
  const base = DAILY_LOGIN_BASE_COINS[plan];

  let streakBase: number;
  if (streak >= 30) streakBase = base * 5;
  else if (streak >= 14) streakBase = base * 3;
  else if (streak >= 7) streakBase = base * 2;
  else if (streak >= 3) streakBase = base + 5;
  else streakBase = base;

  const milestoneBonus = STREAK_MILESTONE_BONUSES[streak] ?? 0;

  return {
    base: streakBase,
    milestoneBonus,
    total: streakBase + milestoneBonus,
    isMilestone: milestoneBonus > 0,
  };
}
