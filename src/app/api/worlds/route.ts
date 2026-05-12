import { NextResponse } from "next/server";
import { ContentRating, WorldMessageRole, WorldRole } from "@prisma/client";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible, normalizeWorldSlug } from "@/lib/rp-world";

export const runtime = "nodejs";

const CreateWorldSchema = z.object({
  name: z.string().min(3).max(80),
  summary: z.string().min(12).max(500),
  setting: z.string().max(2000).optional().default(""),
  isPublic: z.boolean().optional().default(true),
  maxMembers: z.number().int().min(2).max(20).optional().default(8),
});

async function uniqueWorldSlug(base: string) {
  const normalized = normalizeWorldSlug(base) || "world";
  let slug = normalized;
  let i = 2;

  while (true) {
    const exists = await prisma.world.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!exists) return slug;
    slug = `${normalized}-${i}`;
    i += 1;
  }
}

export async function GET() {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const worlds = await prisma.world.findMany({
    where: {
      OR: [{ isPublic: true }, { members: { some: { userId: user.id } } }],
      contentRating: ContentRating.SAFE,
    },
    orderBy: [{ lastActivityAt: "desc" }],
    take: 60,
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      isPublic: true,
      maxMembers: true,
      lastActivityAt: true,
      createdAt: true,
      owner: {
        select: {
          displayName: true,
          email: true,
        },
      },
      members: {
        where: { userId: user.id },
        take: 1,
        select: { id: true, role: true },
      },
      _count: {
        select: {
          members: true,
          messages: true,
        },
      },
    },
  });

  return NextResponse.json({ worlds });
}

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => null);
  const parsed = CreateWorldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid world settings.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const slug = await uniqueWorldSlug(parsed.data.name);
  const world = await prisma.world.create({
    data: {
      ownerId: user.id,
      name: parsed.data.name,
      slug,
      summary: parsed.data.summary,
      setting: parsed.data.setting || null,
      contentRating: ContentRating.SAFE,
      isPublic: parsed.data.isPublic,
      maxMembers: parsed.data.maxMembers,
      members: {
        create: {
          userId: user.id,
          role: WorldRole.HOST,
          displayName: user.email?.split("@")[0] ?? user.id.slice(0, 8),
        },
      },
      messages: {
        create: {
          role: WorldMessageRole.SYSTEM,
          content: `${parsed.data.name} is now live. Set the opening scene and invite players.`,
          authorUserId: null,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      name: true,
    },
  });

  return NextResponse.json({ ok: true, world });
}
