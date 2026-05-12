import { NextResponse } from "next/server";
import { z } from "zod";
import { WorldRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

const UpdateReputationSchema = z.object({
  userId: z.string().optional().default(""),
  delta: z.number().int().min(-50).max(50),
  reason: z.string().max(300).optional().default("manual_adjustment"),
});

function repToLevel(reputation: number) {
  if (reputation >= 90) return 5;
  if (reputation >= 70) return 4;
  if (reputation >= 50) return 3;
  if (reputation >= 25) return 2;
  return 1;
}

type RepHistoryEntry = {
  at: string;
  delta: number;
  from: number;
  to: number;
  reason: string;
  updatedByUserId: string;
};

function parseHistory(metadata: unknown): RepHistoryEntry[] {
  if (!metadata || typeof metadata !== "object") return [];
  const raw = (metadata as Record<string, unknown>).history;
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
    .map((entry) => ({
      at: typeof entry.at === "string" ? entry.at : "",
      delta: typeof entry.delta === "number" ? Math.round(entry.delta) : 0,
      from: typeof entry.from === "number" ? Math.round(entry.from) : 0,
      to: typeof entry.to === "number" ? Math.round(entry.to) : 0,
      reason: typeof entry.reason === "string" ? entry.reason : "manual_adjustment",
      updatedByUserId:
        typeof entry.updatedByUserId === "string" ? entry.updatedByUserId : "unknown",
    }))
    .filter((entry) => entry.at);
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ worldId: string; factionId: string }> },
) {
  const { worldId, factionId } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const membership = await prisma.worldMember.findUnique({
    where: { worldId_userId: { worldId, userId: user.id } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Join world first." }, { status: 403 });
  }

  const faction = await prisma.faction.findFirst({
    where: { id: factionId, worldId },
    select: { id: true, slug: true, name: true },
  });
  if (!faction) return NextResponse.json({ error: "Faction not found." }, { status: 404 });

  const reputation = await prisma.userFactionReputation.findUnique({
    where: { userId_factionId: { userId: user.id, factionId } },
    select: { reputation: true, level: true, metadata: true, lastUpdatedAt: true },
  });

  return NextResponse.json({
    faction,
    reputation: reputation ?? {
      reputation: 50,
      level: repToLevel(50),
      metadata: {},
      lastUpdatedAt: null,
    },
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ worldId: string; factionId: string }> },
) {
  const { worldId, factionId } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (user.suspendedAt) return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  if (!isRpWorldEligible(user.plan)) {
    return NextResponse.json({ error: "Multiplayer worlds require PRO or UNLIMITED." }, { status: 403 });
  }

  const membership = await prisma.worldMember.findUnique({
    where: { worldId_userId: { worldId, userId: user.id } },
    select: { role: true },
  });
  if (!membership) return NextResponse.json({ error: "Join world first." }, { status: 403 });

  const faction = await prisma.faction.findFirst({
    where: { id: factionId, worldId },
    select: { id: true },
  });
  if (!faction) return NextResponse.json({ error: "Faction not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateReputationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid reputation payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const targetUserId =
    membership.role === WorldRole.HOST && parsed.data.userId
      ? parsed.data.userId
      : user.id;

  const existing = await prisma.userFactionReputation.findUnique({
    where: { userId_factionId: { userId: targetUserId, factionId } },
    select: { reputation: true, metadata: true },
  });

  const prevReputation = existing?.reputation ?? 50;
  const nextReputation = Math.max(0, Math.min(100, prevReputation + parsed.data.delta));
  const nextLevel = repToLevel(nextReputation);
  const nextHistoryEntry: RepHistoryEntry = {
    at: new Date().toISOString(),
    delta: parsed.data.delta,
    from: prevReputation,
    to: nextReputation,
    reason: parsed.data.reason,
    updatedByUserId: user.id,
  };
  const priorHistory = parseHistory(existing?.metadata);
  const history = [nextHistoryEntry, ...priorHistory].slice(0, 12);
  const metadata = {
    reason: parsed.data.reason,
    updatedByUserId: user.id,
    history,
  };

  const reputation = await prisma.userFactionReputation.upsert({
    where: { userId_factionId: { userId: targetUserId, factionId } },
    update: {
      reputation: nextReputation,
      level: nextLevel,
      metadata,
    },
    create: {
      userId: targetUserId,
      factionId,
      reputation: nextReputation,
      level: nextLevel,
      metadata,
    },
    select: {
      reputation: true,
      level: true,
      metadata: true,
      lastUpdatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, reputation });
}
