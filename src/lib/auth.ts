import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { SubscriptionPlan, UserRole } from "@prisma/client";

export type AuthedUser = {
  id: string;
  supabaseUserId: string;
  email: string | null;
  ageVerifiedAt: Date | null;
  plan: SubscriptionPlan;
  role: UserRole;
  suspendedAt: Date | null;
};

export const DAILY_MESSAGE_LIMITS: Record<SubscriptionPlan, number | null> = {
  BASIC: 50,
  PRO: 500,
  UNLIMITED: null,
};

export const CONTEXT_WINDOW_SIZES: Record<SubscriptionPlan, number> = {
  BASIC: 12,
  PRO: 25,
  UNLIMITED: 40,
};

export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createSupabaseServerClientReadOnly();

  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !supabaseUser) {
    return null;
  }

  const dbUser = await prisma.user.findUnique({
    where: {
      supabaseUserId: supabaseUser.id,
    },
    select: {
      id: true,
      supabaseUserId: true,
      email: true,
      ageVerifiedAt: true,
      plan: true,
      role: true,
      suspendedAt: true,
      bannedAt: true,
    },
  });

  if (!dbUser) {
    return null;
  }

  // Permanently banned users are treated as logged out
  if (dbUser.bannedAt) {
    return null;
  }

  return {
    id: dbUser.id,
    supabaseUserId: dbUser.supabaseUserId,
    email: dbUser.email ?? null,
    ageVerifiedAt: dbUser.ageVerifiedAt ?? null,
    plan: dbUser.plan,
    role: dbUser.role,
    suspendedAt: dbUser.suspendedAt ?? null,
  };
}
