import { NextResponse } from "next/server";
import { z } from "zod";
import { WorldMessageRole } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

const CreateWorldMessageSchema = z.object({
  content: z.string().min(1).max(2500),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const world = await prisma.world.findUnique({
    where: { id: worldId },
    select: {
      id: true,
      isPublic: true,
      members: {
        where: { userId: user.id },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!world) {
    return NextResponse.json({ error: "World not found." }, { status: 404 });
  }
  if (!world.isPublic && world.members.length === 0) {
    return NextResponse.json({ error: "World is private." }, { status: 403 });
  }

  const url = new URL(req.url);
  const limit = Math.min(120, Math.max(1, Number(url.searchParams.get("limit") ?? "80") || 80));
  const messages = await prisma.worldMessage.findMany({
    where: {
      worldId,
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: {
      id: true,
      role: true,
      content: true,
      metadata: true,
      createdAt: true,
      authorUser: {
        select: {
          id: true,
          displayName: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ messages });
}

export async function POST(
  req: Request,
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

  const membership = await prisma.worldMember.findUnique({
    where: {
      worldId_userId: {
        worldId,
        userId: user.id,
      },
    },
    select: {
      id: true,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Join world first." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateWorldMessageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid message.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const content = parsed.data.content.trim();
  if (!content) {
    return NextResponse.json({ error: "Message is empty." }, { status: 400 });
  }

  const [message] = await prisma.$transaction([
    prisma.worldMessage.create({
      data: {
        worldId,
        authorUserId: user.id,
        role: WorldMessageRole.USER,
        content,
      },
      select: {
        id: true,
        role: true,
        content: true,
        metadata: true,
        createdAt: true,
        authorUser: {
          select: {
            id: true,
            displayName: true,
            email: true,
          },
        },
      },
    }),
    prisma.worldMember.update({
      where: {
        worldId_userId: {
          worldId,
          userId: user.id,
        },
      },
      data: { lastSeenAt: new Date() },
    }),
    prisma.world.update({
      where: { id: worldId },
      data: { lastActivityAt: new Date() },
    }),
  ]);

  return NextResponse.json({ ok: true, message });
}
