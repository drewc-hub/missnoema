import { NextResponse, type NextRequest } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import {
    createSupabaseServerClientRoute,
    applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
    const url = new URL(req.url);

    const rawNext = url.searchParams.get("next") ?? "/companions";
    const next = rawNext.startsWith("/") ? rawNext : "/companions"; // prevent open redirect

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
    }

    if (authError) {
        const to = new URL("/login", url.origin);
        to.searchParams.set("next", next);
        to.searchParams.set("error", authError);
        const res = NextResponse.redirect(to, 303);
        return applySupabaseCookies(res, cookiesToSet);
    }

    const { data } = await supabase.auth.getUser();
    if (!data.user) {
        const to = new URL("/login", url.origin);
        to.searchParams.set("next", next);
        const res = NextResponse.redirect(to, 303);
        return applySupabaseCookies(res, cookiesToSet);
    }

    const res = NextResponse.redirect(new URL(next, url.origin), 303);
    return applySupabaseCookies(res, cookiesToSet);
}
