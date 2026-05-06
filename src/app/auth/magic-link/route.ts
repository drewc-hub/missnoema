import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import {
    createSupabaseServerClientRoute,
    applySupabaseCookies,
} from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma"; // adjust if different

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const contentType = req.headers.get("content-type") ?? "";

    let email: string | null = null;
    let next: string | null = null;

    if (contentType.includes("application/json")) {
        const body = await req.json();
        email = typeof body.email === "string" ? body.email : null;
        next = typeof body.next === "string" ? body.next : null;
    } else {
        const form = await req.formData();
        email = (form.get("email") as string | null) ?? null;
        next = (form.get("next") as string | null) ?? null;
    }

    if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Prevent open redirect
    const safeNext = next && next.startsWith("/") ? next : "/companions";
    const emailRedirectTo = `${url.origin}/auth/magic-link?next=${encodeURIComponent(safeNext)}`;

    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
    });

    if (error) {
        const res = NextResponse.json({ error: error.message }, { status: 400 });
        return applySupabaseCookies(res, cookiesToSet);
    }

    const res = NextResponse.json({ ok: true });
    return applySupabaseCookies(res, cookiesToSet);
}

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const rawNext = url.searchParams.get("next") ?? "/companions";
    const next = rawNext.startsWith("/") ? rawNext : "/companions";

    const code = url.searchParams.get("code");
    const token_hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as EmailOtpType | null;

    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

    let authError: string | null = null;

    if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) authError = "oauth_callback_failed";
    } else if (token_hash && type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (error) authError = "otp_verify_failed";
    } else {
        authError = "missing_auth_params";
    }

    if (authError) {
        const to = new URL("/login", url.origin);
        to.searchParams.set("next", next);
        to.searchParams.set("error", authError);
        const res = NextResponse.redirect(to, 303);
        return applySupabaseCookies(res, cookiesToSet);
    }

    const { data: userData, error: getUserError } = await supabase.auth.getUser();

    if (getUserError || !userData.user) {
        const to = new URL("/login", url.origin);
        to.searchParams.set("next", next);
        to.searchParams.set("error", "session_not_established");
        const res = NextResponse.redirect(to, 303);
        return applySupabaseCookies(res, cookiesToSet);
    }

    // Ensure app user exists
    await prisma.user.upsert({
        where: { supabaseUserId: userData.user.id },
        update: { email: userData.user.email ?? null },
        create: {
            supabaseUserId: userData.user.id,
            email: userData.user.email ?? null,
            ageVerifiedAt: null,
        },
    });

    const res = NextResponse.redirect(new URL(next, url.origin), 303);
    return applySupabaseCookies(res, cookiesToSet);
}
