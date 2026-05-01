// file: src/app/auth/password/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";
import { validatePassword } from "@/lib/auth";

const BodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  mode: z.enum(["signin", "signup"]),
  next: z.string().optional(),
});

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: unknown;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    body = await req.json();
  } else {
    const form = await req.formData();
    body = {
      email: form.get("email"),
      password: form.get("password"),
      mode: form.get("mode"),
      next: form.get("next") ?? undefined,
    };
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password, mode, next } = parsed.data;

  // Server-side password policy check (signup only)
  if (mode === "signup") {
    const pwErrors = validatePassword(password);
    if (pwErrors.length > 0) {
      return NextResponse.json({ error: pwErrors.join(" ") }, { status: 422 });
    }
  }

  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);

  let authError: string | null = null;

  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      // Surface friendly messages for common Supabase error codes
      if (error.message.toLowerCase().includes("already registered")) {
        authError = "An account with this email already exists. Try signing in.";
      } else if (error.message.toLowerCase().includes("weak password")) {
        authError = "Password is too weak. " + error.message;
      } else {
        authError = error.message;
      }
    }
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      if (
        error.message.toLowerCase().includes("invalid login") ||
        error.message.toLowerCase().includes("invalid credentials")
      ) {
        authError = "Incorrect email or password.";
      } else {
        authError = error.message;
      }
    }
  }

  if (authError) {
    const res = NextResponse.json({ error: authError }, { status: 401 });
    return applySupabaseCookies(res, cookiesToSet);
  }

  const redirectTo = next ?? "/companions";
  const res = NextResponse.json({ ok: true, redirectTo });
  return applySupabaseCookies(res, cookiesToSet);
}
