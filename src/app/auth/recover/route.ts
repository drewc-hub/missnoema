import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClientRoute, applySupabaseCookies } from "@/lib/supabase/server";

const BodySchema = z.object({
  email: z.string().email(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const form = await req.formData();
    body = { email: form.get("email") };
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: "https://missnoema.com/auth/reset-password",
  });

  if (error) {
    const res = NextResponse.json({ error: error.message }, { status: 400 });
    return applySupabaseCookies(res, cookiesToSet);
  }

  const res = NextResponse.json({ ok: true });
  return applySupabaseCookies(res, cookiesToSet);
}
