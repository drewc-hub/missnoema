import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

/**
 * This is a temporary admin endpoint.
 * Protect it behind a secret header until you integrate a real age-verify provider.
 */
const Schema = z.object({
  supabaseUserId: z.string().min(5),
  adminSecret: z.string().min(8),
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);

  const parsed = Schema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  if (parsed.data.adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.update({
    where: { supabaseUserId: parsed.data.supabaseUserId },
    data: { ageVerifiedAt: new Date() },
    select: { id: true, supabaseUserId: true, ageVerifiedAt: true },
  });

  return NextResponse.json({ ok: true, user });
}
