// src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
    createSupabaseServerClientRoute,
    applySupabaseCookies,
} from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const origin = url.origin;

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=no-code`);
    }

    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(request);

    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
        console.log("AUTH CALLBACK exchange error", exchangeError.message);
        return NextResponse.redirect(`${origin}/login?error=exchange-failed`);
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
        console.log("AUTH CALLBACK no user", userError?.message);
        return NextResponse.redirect(`${origin}/login?error=no-user`);
    }

    await prisma.user.upsert({
        where: { supabaseUserId: user.id },
        update: { email: user.email ?? null },
        create: {
            supabaseUserId: user.id,
            email: user.email ?? null,
            ageVerifiedAt: null,
        },
    });

    // ✅ Attach the session cookies to the redirect response
    const redirectResponse = NextResponse.redirect(`${origin}/`);
    return applySupabaseCookies(redirectResponse, cookiesToSet);
}
