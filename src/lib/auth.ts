// src/lib/auth.ts

import { prisma } from '@/lib/prisma';
import { session } from '@descope/nextjs-sdk/server';

export type AuthedUser = {
    id: string;
    supabaseUserId: string;
    email: string | null;
    ageVerifiedAt: Date | null;
};

export async function getAuthedUser(): Promise<AuthedUser | null> {
    const descopeSession = await session();

    if (!descopeSession) {
        return null;
    }

    const descopeUserId = descopeSession.token.sub as string;

    const dbUser = await prisma.user.findUnique({
        where: { supabaseUserId: descopeUserId },
        select: {
            id: true,
            supabaseUserId: true,
            email: true,
            ageVerifiedAt: true,
        },
    });

    return dbUser
        ? {
              id: dbUser.id,
              supabaseUserId: dbUser.supabaseUserId,
              email: dbUser.email ?? null,
              ageVerifiedAt: dbUser.ageVerifiedAt ?? null,
          }
        : null;
}
