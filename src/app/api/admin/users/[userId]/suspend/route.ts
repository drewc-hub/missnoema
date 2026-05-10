import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/moderation";

export const runtime = "nodejs";

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const SuspendSchema = z.object({
  action: z.enum(["suspend", "unsuspend", "ban", "unban"]),
  reason: z.string().max(500).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const secret = req.headers.get("x-admin-secret");
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { userId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = SuspendSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { action, reason } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const now = new Date();

  let update: Record<string, unknown> = {};
  if (action === "suspend") {
    update = { suspendedAt: now, suspendedReason: reason ?? null };
  } else if (action === "unsuspend") {
    update = { suspendedAt: null, suspendedReason: null };
  } else if (action === "ban") {
    update = { bannedAt: now, bannedReason: reason ?? null, suspendedAt: null, suspendedReason: null };
  } else if (action === "unban") {
    update = { bannedAt: null, bannedReason: null };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.user.update({ where: { id: userId }, data: update as any });

  logAudit(userId, `admin_${action}`, { reason, by: "admin" });

  return NextResponse.json({ ok: true, action, userId });
}
