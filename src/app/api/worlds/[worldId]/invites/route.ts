import { NextResponse } from "next/server";
import { WorldRole } from "@prisma/client";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateInviteCode, isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

const CreateInviteSchema = z.object({
  maxUses: z.number().int().min(1).max(500).optional().default(25),
  expiresHours: z.number().int().min(1).max(720).optional().default(72),
});

async function createUniqueCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = generateInviteCode(8);
    const exists = await prisma.worldInvite.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error("Could not create unique invite code.");
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const world = await prisma.world.findUnique({
    where: { id: worldId },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: {
          userId: user.id,
          role: WorldRole.HOST,
        },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!world) return NextResponse.json({ error: "World not found." }, { status: 404 });
  const isHost = world.ownerId === user.id || world.members.length > 0;
  if (!isHost) return NextResponse.json({ error: "Host access required." }, { status: 403 });

  const invites = await prisma.worldInvite.findMany({
    where: { worldId },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      id: true,
      code: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      revokedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ invites });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (user.suspendedAt) return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  if (!isRpWorldEligible(user.plan)) {
    return NextResponse.json(
      { error: "Multiplayer worlds require PRO or UNLIMITED." },
      { status: 403 },
    );
  }

  const world = await prisma.world.findUnique({
    where: { id: worldId },
    select: { id: true, ownerId: true },
  });
  if (!world) return NextResponse.json({ error: "World not found." }, { status: 404 });
  if (world.ownerId !== user.id) {
    return NextResponse.json({ error: "Only world hosts can create invites." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid invite settings.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const code = await createUniqueCode();
  const expiresAt = new Date(Date.now() + parsed.data.expiresHours * 60 * 60 * 1000);
  const invite = await prisma.worldInvite.create({
    data: {
      worldId,
      code,
      createdByUserId: user.id,
      maxUses: parsed.data.maxUses,
      expiresAt,
    },
    select: {
      id: true,
      code: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, invite });
}
