import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import {
    createSupabaseServerClientRoute,
    applySupabaseCookies,
} from "@/lib/supabase/server";

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
        email = form.get("email") as string | null;
        next = form.get("next") as string | null;
    }

    if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    // Prevent open redirect — only allow relative paths
    const safeNext =
        next && next.startsWith("/") ? next : "/companions";

    const redirectTo = `${url.origin}/auth/magic-link?next=${encodeURIComponent(safeNext)}`;

    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo },
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
    const next = rawNext.startsWith("/") ? rawNext : "/companions"; // prevent open redirect

    const code = url.searchParams.get("code");
    const token_hash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as EmailOtpType | null;

    console.log("[magic-link] GET callback received", {
        hasCode: !!code,
        hasTokenHash: !!token_hash,
        type,
        next,
    });

    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

    let authError: string | null = null;

    if (code) {
        console.log("[magic-link] Attempting exchangeCodeForSession");
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
            console.error("[magic-link] exchangeCodeForSession failed", {
                message: error.message,
                status: error.status,
            });
            authError = "oauth_callback_failed";
        } else {
            console.log("[magic-link] exchangeCodeForSession succeeded", {
                userId: data.user?.id,
                email: data.user?.email,
            });
        }
    } else if (token_hash && type) {
        console.log("[magic-link] Attempting verifyOtp", { type });
        const { data, error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (error) {
            console.error("[magic-link] verifyOtp failed", {
                message: error.message,
                status: error.status,
            });
            authError = "otp_verify_failed";
        } else {
            console.log("[magic-link] verifyOtp succeeded", {
                userId: data.user?.id,
                email: data.user?.email,
            });
        }
    } else {
        console.warn("[magic-link] No code or token_hash+type received — cannot authenticate", {
            hasCode: !!code,
            hasTokenHash: !!token_hash,
            type,
        });
        authError = "missing_auth_params";
    }

    if (authError) {
        console.error("[magic-link] Redirecting to /login due to auth error", { authError });
        const to = new URL("/login", url.origin);
        to.searchParams.set("next", next);
        to.searchParams.set("error", authError);
        const res = NextResponse.redirect(to, 303);
        return applySupabaseCookies(res, cookiesToSet);
    }

    const { data: userData, error: getUserError } = await supabase.auth.getUser();
    console.log("[magic-link] getUser() after verification", {
        userId: userData.user?.id ?? null,
        email: userData.user?.email ?? null,
        getUserError: getUserError?.message ?? null,
        cookiesQueued: cookiesToSet.length,
    });

    if (!userData.user) {
        console.error("[magic-link] Session not established after successful verification — cookie issue likely");
        const to = new URL("/login", url.origin);
        to.searchParams.set("next", next);
        to.searchParams.set("error", "session_not_established");
        const res = NextResponse.redirect(to, 303);
        return applySupabaseCookies(res, cookiesToSet);
    }

    console.log("[magic-link] Authentication successful, redirecting", { next });
    const res = NextResponse.redirect(new URL(next, url.origin), 303);
    return applySupabaseCookies(res, cookiesToSet);
}
