import { NextResponse } from "next/server";
import { WorldMessageRole, WorldRole } from "@prisma/client";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

const UpdateRoleSchema = z.object({
  role: z.enum(["HOST", "PLAYER"]),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ worldId: string; memberUserId: string }> },
) {
  const { worldId, memberUserId } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (!isRpWorldEligible(user.plan)) {
    return NextResponse.json(
      { error: "Multiplayer worlds require PRO or UNLIMITED." },
      { status: 403 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = UpdateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid role.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const world = await prisma.world.findUnique({
    where: { id: worldId },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId: user.id },
        select: { role: true },
        take: 1,
      },
    },
  });

  if (!world) return NextResponse.json({ error: "World not found." }, { status: 404 });

  const actorRole = world.members[0]?.role ?? null;
  const canManage = world.ownerId === user.id || actorRole === WorldRole.HOST;
  if (!canManage) {
    return NextResponse.json({ error: "Host access required." }, { status: 403 });
  }

  const targetMembership = await prisma.worldMember.findUnique({
    where: {
      worldId_userId: {
        worldId,
        userId: memberUserId,
      },
    },
    select: {
      userId: true,
      role: true,
      user: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  if (memberUserId === world.ownerId) {
    return NextResponse.json(
      { error: "World owner role cannot be changed." },
      { status: 403 },
    );
  }

  const nextRole = parsed.data.role === "HOST" ? WorldRole.HOST : WorldRole.PLAYER;
  if (nextRole === targetMembership.role) {
    return NextResponse.json({ ok: true, role: targetMembership.role });
  }

  const targetName =
    targetMembership.user.displayName ||
    targetMembership.user.email?.split("@")[0] ||
    "Player";
  const actionText =
    nextRole === WorldRole.HOST
      ? `${targetName} was promoted to co-host.`
      : `${targetName} was demoted to player.`;

  await prisma.$transaction([
    prisma.worldMember.update({
      where: {
        worldId_userId: {
          worldId,
          userId: memberUserId,
        },
      },
      data: {
        role: nextRole,
      },
    }),
    prisma.worldMessage.create({
      data: {
        worldId,
        role: WorldMessageRole.SYSTEM,
        content: actionText,
      },
    }),
    prisma.world.update({
      where: { id: worldId },
      data: { lastActivityAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, role: nextRole });
}
