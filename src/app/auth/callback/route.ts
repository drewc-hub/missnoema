import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientRoute, applySupabaseCookies } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const next = url.searchParams.get("next") ?? "/companions";
    const safeNext = next.startsWith("/") ? next : "/companions";
    const code = url.searchParams.get("code");

    if (!code) {
        return NextResponse.redirect(new URL("/login?error=no-code", url.origin));
    }

    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

    const { error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
        console.error("AUTH CALLBACK exchange failed:", exchangeError.message);
        const res = NextResponse.redirect(
            new URL(`/login?error=exchange-failed`, url.origin),
            303,
        );
        return applySupabaseCookies(res, cookiesToSet);
    }

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error("AUTH CALLBACK no user:", userError?.message);
        const res = NextResponse.redirect(
            new URL(`/login?error=no-user`, url.origin),
            303,
        );
        return applySupabaseCookies(res, cookiesToSet);
    }

    await prisma.user.upsert({
        where: {
            supabaseUserId: user.id,
        },
        update: {
            email: user.email ?? null,
        },
        create: {
            supabaseUserId: user.id,
            email: user.email ?? null,
            ageVerifiedAt: null,
        },
    });

    const res = NextResponse.redirect(
        new URL(safeNext, url.origin),
        303,
    );

    return applySupabaseCookies(res, cookiesToSet);
}
