import { NextResponse } from "next/server";
import { WorldMessageRole, WorldRole } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ worldId: string; inviteId: string }> },
) {
  const { worldId, inviteId } = await params;
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

  const invite = await prisma.worldInvite.findUnique({
    where: { id: inviteId },
    select: {
      id: true,
      worldId: true,
      code: true,
      revokedAt: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      createdAt: true,
    },
  });

  if (!invite || invite.worldId !== worldId) {
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  }

  if (invite.revokedAt) {
    return NextResponse.json({ ok: true, invite });
  }

  const revokedAt = new Date();
  const [updatedInvite] = await prisma.$transaction([
    prisma.worldInvite.update({
      where: { id: invite.id },
      data: { revokedAt },
      select: {
        id: true,
        code: true,
        maxUses: true,
        usedCount: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
      },
    }),
    prisma.worldMessage.create({
      data: {
        worldId,
        role: WorldMessageRole.SYSTEM,
        content: `Invite ${invite.code} was disabled by a host.`,
      },
    }),
    prisma.world.update({
      where: { id: worldId },
      data: { lastActivityAt: revokedAt },
    }),
  ]);

  return NextResponse.json({ ok: true, invite: updatedInvite });
}
