import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export type AuthedUser = {
  id: string;
  supabaseUserId: string;
  email: string | null;
  ageVerifiedAt: Date | null;
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
    },
  });

  if (!dbUser) {
    return null;
  }

  return {
    id: dbUser.id,
    supabaseUserId: dbUser.supabaseUserId,
    email: dbUser.email ?? null,
    ageVerifiedAt: dbUser.ageVerifiedAt ?? null,
  };
}
