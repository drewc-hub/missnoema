import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { generateLoreEntries } from "@/lib/procedural-lore";

export const runtime = "nodejs";

const BodySchema = z.object({
  seed: z.string().max(200).optional().default(""),
  worldHint: z.string().max(400).optional().default(""),
  tone: z.string().max(80).optional().default("mysterious"),
  factions: z.array(z.string()).optional().default([]),
  count: z.number().int().min(1).max(8).optional().default(3),
  persist: z.boolean().optional().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid lore generation payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      visibility: { in: [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE] },
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      contentRating: true,
      profile: true,
    },
  });

  if (!companion) {
    return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  }
  if (companion.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json({ error: "Age verification required." }, { status: 403 });
  }

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};
  const proceduralLore =
    profile.proceduralLore && typeof profile.proceduralLore === "object"
      ? (profile.proceduralLore as Record<string, unknown>)
      : {};

  const seed =
    parsed.data.seed ||
    (typeof proceduralLore.seed === "string" ? proceduralLore.seed : "") ||
    companion.id;

  const entries = generateLoreEntries({
    seed,
    companionName: companion.name,
    worldHint: parsed.data.worldHint || (typeof proceduralLore.worldHint === "string" ? proceduralLore.worldHint : ""),
    tone: parsed.data.tone || (typeof proceduralLore.tone === "string" ? proceduralLore.tone : "mysterious"),
    factions: parsed.data.factions.length
      ? parsed.data.factions
      : Array.isArray(proceduralLore.factions)
      ? proceduralLore.factions.filter((v): v is string => typeof v === "string")
      : [],
    count: parsed.data.count,
  });

  if (parsed.data.persist && companion.ownerId === user.id) {
    const mergedProfile: Record<string, unknown> = {
      ...profile,
      proceduralLore: {
        ...proceduralLore,
        seed,
        worldHint: parsed.data.worldHint || (typeof proceduralLore.worldHint === "string" ? proceduralLore.worldHint : ""),
        tone: parsed.data.tone || (typeof proceduralLore.tone === "string" ? proceduralLore.tone : "mysterious"),
        factions: parsed.data.factions.length
          ? parsed.data.factions
          : Array.isArray(proceduralLore.factions)
          ? proceduralLore.factions
          : [],
        generated: entries,
      },
    };
    await prisma.companion.update({
      where: { id: companion.id },
      data: { profile: mergedProfile as any },
    });
  }

  return NextResponse.json({
    ok: true,
    entries,
    seed,
  });
}
