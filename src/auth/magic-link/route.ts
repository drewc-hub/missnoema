import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClientRoute, applySupabaseCookies } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/app-url";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const next =
    typeof body?.next === "string" && body.next.startsWith("/")
      ? body.next
      : "/companions";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${getOrigin(req)}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  return applySupabaseCookies(res, cookiesToSet);
}
