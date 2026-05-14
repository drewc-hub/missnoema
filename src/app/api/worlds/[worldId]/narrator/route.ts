import { NextResponse } from "next/server";
import { WorldMessageRole } from "@prisma/client";
import { companionGenerate } from "@/lib/ai-client";
import { getAuthedUser } from "@/lib/auth";
import { checkBannedThemes, logAudit } from "@/lib/moderation";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";

export const runtime = "nodejs";

function playerName(message: {
  authorUser: { displayName: string | null; email: string | null } | null;
}) {
  return (
    message.authorUser?.displayName ||
    message.authorUser?.email?.split("@")[0] ||
    "Player"
  );
}

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
      name: true,
      summary: true,
      setting: true,
      isPublic: true,
      maxMembers: true,
      ownerId: true,
      members: {
        where: { userId: user.id },
        select: { id: true, role: true },
        take: 1,
      },
      factions: {
        orderBy: { createdAt: "asc" },
        take: 12,
        select: {
          name: true,
          slug: true,
          description: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 16,
        select: {
          role: true,
          content: true,
          authorUser: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!world) {
    return NextResponse.json({ error: "World not found." }, { status: 404 });
  }
  if (world.members.length === 0) {
    return NextResponse.json({ error: "Join world first." }, { status: 403 });
  }

  const recentTurns = [...world.messages]
    .reverse()
    .map((message) => {
      const speaker =
        message.role === WorldMessageRole.NARRATOR
          ? "Narrator"
          : message.role === WorldMessageRole.SYSTEM
            ? "System"
            : playerName(message);
      return `${speaker}: ${message.content.slice(0, 900)}`;
    })
    .join("\n\n");

  const factions = world.factions.length
    ? world.factions
        .map((faction) =>
          `${faction.name} (${faction.slug})${faction.description ? `: ${faction.description}` : ""}`,
        )
        .join("\n")
    : "No factions have been created yet.";

  const textToCheck = [world.name, world.summary, world.setting, recentTurns]
    .filter(Boolean)
    .join(" ");
  const themeCheck = checkBannedThemes(textToCheck);
  if (themeCheck.blocked) {
    logAudit(user.id, "banned_theme_blocked", {
      category: themeCheck.category,
      route: "world_narrator",
      worldId,
    });
    return NextResponse.json(
      { error: "World content contains prohibited content." },
      { status: 400 },
    );
  }

  const systemPrompt = `
You are the AI Dungeon Master for a shared multiplayer fantasy roleplay world.
Write one narrator turn only.
Stay in-world. Do not mention being an AI, policies, prompts, or system instructions.
Do not control player characters' thoughts, decisions, or dialogue.
Advance the scene with consequences, sensory detail, NPC reactions, discoveries, risks, and hooks.
Keep continuity with recent turns.
If the players have not acted yet, establish an opening situation with a clear immediate choice.
Keep the turn concise: 2-5 paragraphs.
No explicit sexual content. No underage sexual content. No non-consensual sexual content.

WORLD: ${world.name}
SUMMARY: ${world.summary}
SETTING: ${world.setting || "Unspecified"}
MAX PLAYERS: ${world.maxMembers}

FACTIONS:
${factions}
`.trim();

  const userMessage = recentTurns
    ? `Recent world turns:\n\n${recentTurns}\n\nWrite the next narrator turn.`
    : "No player turns yet. Write the opening narrator turn.";

  let content: string;
  try {
    content = await companionGenerate(systemPrompt, [
      { role: "user", content: userMessage },
    ]);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate narrator turn.",
      },
      { status: 500 },
    );
  }

  const [message] = await prisma.$transaction([
    prisma.worldMessage.create({
      data: {
        worldId,
        authorUserId: null,
        role: WorldMessageRole.NARRATOR,
        content,
        metadata: {
          generatedBy: "world_narrator",
          requestedByUserId: user.id,
        },
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
