// file: src/app/auth/magic-link/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

const BodySchema = z.object({
  email: z.string().email(),
  next: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const parsed = BodySchema.safeParse({
    email: form.get("email"),
    next: form.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  const redirectTo = new URL(
    "/auth/callback",
    process.env.BASE_URL ?? "http://localhost:3000",
  );
  if (parsed.data.next) redirectTo.searchParams.set("next", parsed.data.next);

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo: redirectTo.toString() },
  });

  let res: Response;
  if (error) res = NextResponse.json({ error: error.message }, { status: 400 });
  else res = NextResponse.json({ ok: true });

  return applySupabaseCookies(res, cookiesToSet);
}
