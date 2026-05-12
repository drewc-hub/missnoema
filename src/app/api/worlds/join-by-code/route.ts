import { NextResponse } from "next/server";
import { WorldMessageRole, WorldRole } from "@prisma/client";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

const JoinByCodeSchema = z.object({
  code: z.string().min(6).max(24),
});

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (user.suspendedAt) return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  if (!isRpWorldEligible(user.plan)) {
    return NextResponse.json(
      { error: "Multiplayer worlds require PRO or UNLIMITED." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = JoinByCodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid invite code.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const code = parsed.data.code.toUpperCase().trim();
  const invite = await prisma.worldInvite.findUnique({
    where: { code },
    select: {
      id: true,
      worldId: true,
      maxUses: true,
      usedCount: true,
      expiresAt: true,
      revokedAt: true,
      world: {
        select: {
          id: true,
          slug: true,
          name: true,
          maxMembers: true,
          _count: { select: { members: true } },
        },
      },
    },
  });

  if (!invite) return NextResponse.json({ error: "Invite code not found." }, { status: 404 });
  if (invite.revokedAt) return NextResponse.json({ error: "Invite revoked." }, { status: 410 });
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) {
    return NextResponse.json({ error: "Invite expired." }, { status: 410 });
  }
  if (invite.usedCount >= invite.maxUses) {
    return NextResponse.json({ error: "Invite fully used." }, { status: 409 });
  }

  const existing = await prisma.worldMember.findUnique({
    where: {
      worldId_userId: {
        worldId: invite.worldId,
        userId: user.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({
      ok: true,
      world: { slug: invite.world.slug, name: invite.world.name },
      alreadyMember: true,
    });
  }

  if (invite.world._count.members >= invite.world.maxMembers) {
    return NextResponse.json({ error: "World is full." }, { status: 409 });
  }

  await prisma.$transaction([
    prisma.worldMember.create({
      data: {
        worldId: invite.worldId,
        userId: user.id,
        role: WorldRole.PLAYER,
        displayName: user.email?.split("@")[0] ?? null,
      },
    }),
    prisma.worldInvite.update({
      where: { id: invite.id },
      data: { usedCount: { increment: 1 } },
    }),
    prisma.world.update({
      where: { id: invite.worldId },
      data: { lastActivityAt: new Date() },
    }),
    prisma.worldMessage.create({
      data: {
        worldId: invite.worldId,
        role: WorldMessageRole.SYSTEM,
        content: `${user.email?.split("@")[0] ?? "A player"} joined via invite.`,
      },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    world: { slug: invite.world.slug, name: invite.world.name },
  });
}
