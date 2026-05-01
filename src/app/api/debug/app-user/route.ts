// file: src/app/api/debug/app-user/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase.auth.getUser();
  if (!data.user)
    return NextResponse.json(
      { ok: false, error: "no supabase user" },
      { status: 200 },
    );

  const row = await prisma.user.findUnique({
    where: { supabaseUserId: data.user.id },
    select: {
      id: true,
      supabaseUserId: true,
      email: true,
      ageVerifiedAt: true,
    },
  });

  return NextResponse.json({ ok: true, supabaseId: data.user.id, dbUser: row });
}
