// file: src/app/auth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/companions";
  const code = url.searchParams.get("code");

  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  // ✅ IMPORTANT: exchange code -> session (sets cookies)
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const to = new URL("/login", url.origin);
      to.searchParams.set("next", next);
      to.searchParams.set("error", "oauth_callback_failed");
      const res = NextResponse.redirect(to, 303);
      return applySupabaseCookies(res, cookiesToSet);
    }
  }

  // confirm user
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
