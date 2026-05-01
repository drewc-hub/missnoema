// file: src/lib/auth.ts
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
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;

  const su = data.user;

  const dbUser = await prisma.user.upsert({
    where: { supabaseUserId: su.id },
    update: { email: su.email ?? undefined },
    create: { supabaseUserId: su.id, email: su.email ?? undefined },
    select: {
      id: true,
      supabaseUserId: true,
      email: true,
      ageVerifiedAt: true,
    },
  });

  return {
    id: dbUser.id,
    supabaseUserId: dbUser.supabaseUserId,
    email: dbUser.email ?? null,
    ageVerifiedAt: dbUser.ageVerifiedAt ?? null,
  };
}

export async function requireUser(): Promise<AuthedUser> {
  const u = await getAuthedUser();
  if (!u) {
    const err = new Error("Unauthorized");
    (err as any).status = 401;
    throw err;
  }
  return u;
}
