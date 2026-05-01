// file: src/app/auth/signout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  const { error } = await supabase.auth.signOut();

  let res: Response;
  if (error) {
    res = NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    const redirectUrl = new URL("/login", process.env.BASE_URL ?? req.url);
    res = NextResponse.redirect(redirectUrl, 303);
  }

  return applySupabaseCookies(res, cookiesToSet);
}
