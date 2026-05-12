import { NextRequest, NextResponse } from "next/server";
import {
  applySupabaseCookies,
  createSupabaseServerClientRoute,
} from "@/lib/supabase/server";
import { getOrigin } from "@/lib/app-url";

export async function POST(req: NextRequest) {
  try {
    const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

    await supabase.auth.signOut();

    const origin = getOrigin(req);
    const res = NextResponse.redirect(new URL("/", origin));
    return applySupabaseCookies(res, cookiesToSet);
  } catch (error) {
    console.error("Logout error:", error);
    const origin = getOrigin(req);
    return NextResponse.redirect(new URL("/", origin));
  }
}
