import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

// Initiates the magic link — called by LoginForm with {email, next}
export async function POST(req: NextRequest) {
  const { email, next } = await req.json();
  const safeNext =
    typeof next === "string" && next.startsWith("/") ? next : "/companions";

  if (!email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const url = new URL(req.url);
  const { supabase } = createSupabaseServerClientRoute(req);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${url.origin}/auth/magic-link?next=${encodeURIComponent(safeNext)}`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);

  const rawNext = url.searchParams.get("next") ?? "/companions";
  const next = rawNext.startsWith("/") ? rawNext : "/companions";

  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=no-code", url.origin),
      303,
    );
  }

  const { supabase, cookiesToSet } =
    createSupabaseServerClientRoute(req);

  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    console.error(
      "[magic-link] exchange failed",
      exchangeError.message,
    );

    const res = NextResponse.redirect(
      new URL("/login?error=exchange-failed", url.origin),
      303,
    );

    return applySupabaseCookies(res, cookiesToSet);
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "[magic-link] getUser failed",
      userError?.message,
    );

    const res = NextResponse.redirect(
      new URL("/login?error=no-user", url.origin),
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

  console.log("[magic-link] login success", {
    userId: user.id,
    email: user.email,
  });

  const res = NextResponse.redirect(
    new URL(next, url.origin),
    303,
  );

  return applySupabaseCookies(res, cookiesToSet);
}
