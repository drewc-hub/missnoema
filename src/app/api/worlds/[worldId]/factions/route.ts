import { NextResponse } from "next/server";
import { z } from "zod";
import { WorldRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

const CreateFactionSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().max(1200).optional().default(""),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
});

function normalizeSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

async function canManageWorld(worldId: string, userId: string) {
  const world = await prisma.world.findUnique({
    where: { id: worldId },
    select: {
      id: true,
      ownerId: true,
      members: {
        where: { userId },
        select: { role: true },
        take: 1,
      },
    },
  });
  if (!world) return { ok: false as const, status: 404 as const, error: "World not found." };
  const role = world.members[0]?.role;
  const canManage = world.ownerId === userId || role === WorldRole.HOST;
  return { ok: true as const, canManage };
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
      isPublic: true,
      members: { where: { userId: user.id }, select: { id: true }, take: 1 },
    },
  });
  if (!world) return NextResponse.json({ error: "World not found." }, { status: 404 });
  if (!world.isPublic && world.members.length === 0) {
    return NextResponse.json({ error: "World is private." }, { status: 403 });
  }

  const factions = await prisma.faction.findMany({
    where: { worldId },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      metadata: true,
      _count: { select: { reputations: true } },
    },
  });

  return NextResponse.json({ factions });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ worldId: string }> },
) {
  const { worldId } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }
  if (!isRpWorldEligible(user.plan)) {
    return NextResponse.json({ error: "Multiplayer worlds require PRO or UNLIMITED." }, { status: 403 });
  }

  const allowed = await canManageWorld(worldId, user.id);
  if (!allowed.ok) {
    return NextResponse.json({ error: allowed.error }, { status: allowed.status });
  }
  if (!allowed.canManage) {
    return NextResponse.json({ error: "Only host can manage factions." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = CreateFactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid faction payload.", details: parsed.error.flatten() }, { status: 400 });
  }

  const slug = normalizeSlug(parsed.data.slug || parsed.data.name);
  const existing = await prisma.faction.findUnique({
    where: { worldId_slug: { worldId, slug } },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Faction slug already exists in this world." }, { status: 409 });
  }

  const faction = await prisma.faction.create({
    data: {
      worldId,
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      metadata: parsed.data.metadata as any,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      metadata: true,
    },
  });

  return NextResponse.json({ ok: true, faction });
}
