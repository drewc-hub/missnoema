import { NextRequest, NextResponse } from "next/server";
import {
  applySupabaseCookies,
  createSupabaseServerClientRoute,
} from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  await supabase.auth.signOut();

  const res = NextResponse.redirect(new URL("/", req.url));
  return applySupabaseCookies(res, cookiesToSet);
}
