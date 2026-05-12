import { NextResponse } from "next/server";
import { WorldMessageRole, WorldRole } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;
  const user = await getAuthedUser();

  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }
  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }
  if (!isRpWorldEligible(user.plan)) {
    return NextResponse.json(
      { error: "Multiplayer worlds require PRO or UNLIMITED." },
      { status: 403 },
    );
  }

  const world = await prisma.world.findUnique({
    where: { id: worldId },
    select: {
      id: true,
      isPublic: true,
      maxMembers: true,
      _count: { select: { members: true } },
    },
  });

  if (!world) {
    return NextResponse.json({ error: "World not found." }, { status: 404 });
  }
  if (!world.isPublic) {
    return NextResponse.json({ error: "World is private." }, { status: 403 });
  }

  const existing = await prisma.worldMember.findUnique({
    where: {
      worldId_userId: {
        worldId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ ok: true, joined: true });
  }
  if (world._count.members >= world.maxMembers) {
    return NextResponse.json({ error: "World is full." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.worldMember.create({
      data: {
        worldId,
        userId: user.id,
        role: WorldRole.PLAYER,
        displayName: user.email?.split("@")[0] ?? null,
      },
    }),
    prisma.world.update({
      where: { id: worldId },
      data: { lastActivityAt: new Date() },
    }),
    prisma.worldMessage.create({
      data: {
        worldId,
        role: WorldMessageRole.SYSTEM,
        content: `${user.email?.split("@")[0] ?? "A player"} joined the world.`,
      },
    }),
  ]);

  return NextResponse.json({ ok: true, joined: true });
}
