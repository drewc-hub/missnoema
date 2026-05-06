import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClientReadOnly();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("[provision] supabase user", {
    userId: user?.id ?? null,
    email: user?.email ?? null,
    error: error?.message ?? null,
  });

  if (error || !user) {
    return NextResponse.json(
      { error: "No Supabase session", detail: error?.message ?? null },
      { status: 401 },
    );
  }

  try {
    const dbUser = await prisma.user.upsert({
      where: {
        supabaseUserId: user.id,
      },
      update: {
        email: user.email ?? null,
      },
      create: {
        supabaseUserId: user.id,
        email: user.email ?? null,
        ageVerifiedAt: null,
      },
      select: {
        id: true,
        email: true,
        supabaseUserId: true,
        ageVerifiedAt: true,
      },
    });

    return NextResponse.json({ ok: true, dbUser });
  } catch (err) {
    console.error("[provision] prisma failed", err);

    return NextResponse.json(
      {
        error: "Prisma upsert failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
