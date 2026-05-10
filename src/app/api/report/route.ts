import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { logAudit } from "@/lib/moderation";
import { ReportReason, ReportTarget } from "@prisma/client";

export const runtime = "nodejs";

const ReportSchema = z.object({
  targetType: z.enum(["COMPANION", "ASSET", "MESSAGE"]),
  targetId: z.string().min(1).max(100),
  reason: z.enum(["UNDERAGE_CONTENT", "NON_CONSENT", "ILLEGAL_CONTENT", "HARASSMENT", "SPAM", "OTHER"]),
  details: z.string().max(2000).optional(),
});

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = ReportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }

  const { targetType, targetId, reason, details } = parsed.data;

  // Prevent duplicate reports from the same user for the same target
  const existing = await prisma.report.findFirst({
    where: { reporterId: user.id, targetType: targetType as ReportTarget, targetId },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  await prisma.report.create({
    data: {
      reporterId: user.id,
      targetType: targetType as ReportTarget,
      targetId,
      reason: reason as ReportReason,
      details: details ?? null,
    },
  });

  logAudit(user.id, "report_submitted", { targetType, targetId, reason });

  return NextResponse.json({ ok: true });
}
