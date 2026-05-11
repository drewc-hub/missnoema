import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientRoute, applySupabaseCookies } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const mode = body?.mode === "signup" ? "signup" : "signin";
  const next =
    typeof body?.next === "string" && body.next.startsWith("/")
      ? body.next
      : "/companions";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // No session means Supabase requires email confirmation before the user can sign in
    if (!data.session) {
      const res = NextResponse.json({ ok: true, requiresConfirmation: true });
      return applySupabaseCookies(res, cookiesToSet);
    }

    // Auto-confirm is on — provision the DB user immediately
    if (data.user) {
      await prisma.user.upsert({
        where: { supabaseUserId: data.user.id },
        update: { email: data.user.email ?? null },
        create: { supabaseUserId: data.user.id, email: data.user.email ?? null, ageVerifiedAt: null },
      });
    }

    const res = NextResponse.json({ ok: true, redirectTo: next });
    return applySupabaseCookies(res, cookiesToSet);
  }

  // Sign in
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Ensure DB record exists (handles first-time login after magic-link signup)
  if (data.user) {
    await prisma.user.upsert({
      where: { supabaseUserId: data.user.id },
      update: { email: data.user.email ?? null },
      create: { supabaseUserId: data.user.id, email: data.user.email ?? null, ageVerifiedAt: null },
    });
  }

  const res = NextResponse.json({ ok: true, redirectTo: next });
  return applySupabaseCookies(res, cookiesToSet);
}
