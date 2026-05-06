// file: src/app/api/debug/whoami/route.ts
import { NextResponse } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET() {
    const descopeSession = await session();
    if (!descopeSession) {
        return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 });
    }
    const descopeUserId = descopeSession.userId;
    const user = await prisma.user.findFirst({
        where: { supabaseUserId: descopeUserId },
        select: { id: true, email: true }
    });
    return NextResponse.json({ ok: true, user });
}
