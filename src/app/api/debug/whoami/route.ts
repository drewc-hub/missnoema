import { NextResponse } from "next/server";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClientReadOnly();

  const {
    data: { user: supabaseUser },
    error,
  } = await supabase.auth.getUser();

  const dbUser = await getAuthedUser();

  return NextResponse.json({
    supabaseUser: supabaseUser
      ? {
          id: supabaseUser.id,
          email: supabaseUser.email,
        }
      : null,
    supabaseError: error?.message ?? null,
    dbUser,
  });
}
