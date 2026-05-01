// FILE: src/app/api/debug/env/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    SUPABASE_URL: process.env.SUPABASE_URL ?? null,
    SUPABASE_ANON_KEY_PREFIX: (process.env.SUPABASE_ANON_KEY ?? "").slice(
      0,
      12,
    ),
  });
}
