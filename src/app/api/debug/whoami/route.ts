// file: src/app/api/debug/whoami/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);
  const { data, error } = await supabase.auth.getUser();

  const res = NextResponse.json({
    ok: !error,
    error: error?.message ?? null,
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
        }
      : null,
  });

  return applySupabaseCookies(res, cookiesToSet);
}
