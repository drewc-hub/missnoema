import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email, password, mode, next } = await req.json();
  const safeNext =
    typeof next === "string" && next.startsWith("/") ? next : "/companions";

  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const res = NextResponse.json({ redirectTo: safeNext });
    return applySupabaseCookies(res, cookiesToSet);
  }

  // signin
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "Sign in failed." },
      { status: 400 },
    );
  }

  await prisma.user.upsert({
    where: { supabaseUserId: data.user.id },
    update: { email: data.user.email ?? null },
    create: {
      supabaseUserId: data.user.id,
      email: data.user.email ?? null,
      ageVerifiedAt: null,
    },
  });

  const res = NextResponse.json({ redirectTo: safeNext });
  return applySupabaseCookies(res, cookiesToSet);
}
