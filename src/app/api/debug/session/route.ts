// file: src/app/api/debug/session/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

function mask(v: string) {
  if (v.length <= 10) return "***";
  return `${v.slice(0, 5)}…${v.slice(-5)}`;
}

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  const cookieNames = req.cookies.getAll().map((c) => c.name);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  const res = NextResponse.json({
    ok: true,
    cookies: {
      names: cookieNames,
      hasSbAccessTokenCookie: cookieNames.some(
        (n) => n.includes("sb-") && n.includes("-auth-token"),
      ),
      hint: "If you see no sb-* cookies after callback, /auth/callback is not exchanging code->session or cookies aren't being applied.",
    },
    user: userData.user
      ? { id: userData.user.id, email: userData.user.email }
      : null,
    session: sessionData.session
      ? {
          access_token: mask(sessionData.session.access_token ?? ""),
          expires_at: sessionData.session.expires_at ?? null,
        }
      : null,
    errors: {
      user: userError?.message ?? null,
      session: sessionError?.message ?? null,
    },
  });

  return applySupabaseCookies(res, cookiesToSet);
}
