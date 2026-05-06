import { NextResponse, type NextRequest } from 'next/server';
import { session } from '@descope/nextjs-sdk/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const descopeSession = await session();
    if (!descopeSession) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === 'string' ? body.email : null;
    const descopeUserId = descopeSession.token.sub as string;

    if (!email) {
        return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    try {
        // Upsert by email; update supabaseUserId to Descope ID so lookups work going forward
        await prisma.user.upsert({
            where: { email },
            update: { supabaseUserId: descopeUserId },
            create: { supabaseUserId: descopeUserId, email, ageVerifiedAt: null },
        });
        return NextResponse.json({ ok: true });
    } catch (err: any) {
        // supabaseUserId unique conflict — user created concurrently; ignore
        if (err?.code === 'P2002') return NextResponse.json({ ok: true });
        console.error('[provision]', err);
        return NextResponse.json({ error: 'provision failed' }, { status: 500 });
    }
}
