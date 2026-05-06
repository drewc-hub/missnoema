import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClientRoute, applySupabaseCookies } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    const url = new URL(req.url);
    const body = await req.json();

    const email = typeof body.email === "string" ? body.email : null;
    const rawNext = typeof body.next === "string" ? body.next : "/companions";
    const safeNext = rawNext.startsWith("/") ? rawNext : "/companions";

    if (!email) {
        return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: `https://missnoema.com/auth/magic-link?next=${encodeURIComponent(safeNext)}`,
        },
    });

    if (error) {
        const res = NextResponse.json({ error: error.message }, { status: 400 });
        return applySupabaseCookies(res, cookiesToSet);
    }

    const res = NextResponse.json({ ok: true });
    return applySupabaseCookies(res, cookiesToSet);
}
