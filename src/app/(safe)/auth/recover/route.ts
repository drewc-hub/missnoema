import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClientRoute } from "@/lib/supabase/server";
import { getOrigin } from "@/lib/app-url";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const { supabase } = createSupabaseServerClientRoute(req);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getOrigin(req)}/auth/reset-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
