import { NextResponse } from "next/server";
import { z } from "zod";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

const StepSchema = z.object({
  nodeId: z.string().optional().default(""),
  choiceId: z.string().optional().default(""),
  worldId: z.string().optional().default(""),
});

type DialogueChoice = {
  id: string;
  label: string;
  nextNodeId?: string | null;
  affinityDelta?: number;
  reputation?: Array<{ factionSlug: string; delta: number }>;
};

type DialogueNode = {
  id: string;
  text: string;
  choices: DialogueChoice[];
};

function parseDialogueTree(profile: unknown): { startNodeId: string; nodes: DialogueNode[] } {
  const raw =
    profile && typeof profile === "object"
      ? (profile as Record<string, unknown>)
      : {};
  const tree =
    raw.dialogueTree && typeof raw.dialogueTree === "object"
      ? (raw.dialogueTree as Record<string, unknown>)
      : {};
  const nodes = Array.isArray(tree.nodes)
    ? tree.nodes
        .filter((node): node is Record<string, unknown> => !!node && typeof node === "object")
        .map((node) => ({
          id: typeof node.id === "string" ? node.id : "",
          text: typeof node.text === "string" ? node.text : "",
          choices: Array.isArray(node.choices)
            ? node.choices
                .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
                .map((c) => ({
                  id: typeof c.id === "string" ? c.id : "",
                  label: typeof c.label === "string" ? c.label : "",
                  nextNodeId: typeof c.nextNodeId === "string" ? c.nextNodeId : null,
                  affinityDelta: typeof c.affinityDelta === "number" ? c.affinityDelta : 0,
                  reputation: Array.isArray(c.reputation)
                    ? c.reputation
                        .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
                        .map((r) => ({
                          factionSlug: typeof r.factionSlug === "string" ? r.factionSlug : "",
                          delta: typeof r.delta === "number" ? Math.round(r.delta) : 0,
                        }))
                        .filter((r) => r.factionSlug.length > 0 && r.delta !== 0)
                    : [],
                }))
                .filter((choice) => choice.id && choice.label)
            : [],
        }))
        .filter((node) => node.id && node.text)
    : [];
  const startNodeId =
    typeof tree.startNodeId === "string" && tree.startNodeId
      ? tree.startNodeId
      : nodes[0]?.id ?? "";

  return { startNodeId, nodes };
}

function clamp01_100(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

async function getCompanionForUser(slug: string, userId: string, allowAdult: boolean) {
  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      visibility: { in: [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE] },
    },
    select: {
      id: true,
      ownerId: true,
      visibility: true,
      contentRating: true,
      profile: true,
    },
  });
  if (!companion) return { error: "Companion not found.", status: 404 as const };
  if (companion.visibility === Visibility.PRIVATE && companion.ownerId !== userId) {
    return { error: "Companion not found.", status: 404 as const };
  }
  if (companion.contentRating === ContentRating.ADULT && !allowAdult) {
    return { error: "Age verification required.", status: 403 as const };
  }
  return { companion };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const resolved = await getCompanionForUser(slug, user.id, isAdultAllowed(user));
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { startNodeId, nodes } = parseDialogueTree(resolved.companion.profile);
  const node = nodes.find((n) => n.id === startNodeId) ?? null;

  return NextResponse.json({
    ok: true,
    startNodeId,
    node,
    totalNodes: nodes.length,
  });
}

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
  const parsed = StepSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid dialogue step payload.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const resolved = await getCompanionForUser(slug, user.id, isAdultAllowed(user));
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const companion = resolved.companion;
  const { startNodeId, nodes } = parseDialogueTree(companion.profile);
  if (!nodes.length) {
    return NextResponse.json({ error: "No dialogue tree configured." }, { status: 400 });
  }

  const currentNodeId = parsed.data.nodeId || startNodeId;
  const currentNode = nodes.find((n) => n.id === currentNodeId) ?? nodes[0];
  if (!currentNode) {
    return NextResponse.json({ error: "Dialogue node not found." }, { status: 404 });
  }

  let selectedChoice: DialogueChoice | null = null;
  let nextNode: DialogueNode | null = currentNode;
  if (parsed.data.choiceId) {
    const maybeChoice = currentNode.choices.find((c) => c.id === parsed.data.choiceId) ?? null;
    if (!maybeChoice) {
      return NextResponse.json({ error: "Choice not found." }, { status: 404 });
    }
    const choice = maybeChoice;
    selectedChoice = choice;
    if (choice.nextNodeId) {
      nextNode = nodes.find((n) => n.id === choice.nextNodeId) ?? null;
    }
  }

  let relationship = await prisma.conversation.findUnique({
    where: {
      userId_companionId: {
        userId: user.id,
        companionId: companion.id,
      },
    },
    select: {
      id: true,
      familiarity: true,
      trust: true,
      intimacy: true,
      relationshipLevel: true,
    },
  });

  const affinityDelta = selectedChoice?.affinityDelta ?? 0;
  if (affinityDelta !== 0 && relationship) {
    relationship = await prisma.conversation.update({
      where: { id: relationship.id },
      data: {
        familiarity: clamp01_100(relationship.familiarity + affinityDelta),
        trust: clamp01_100(relationship.trust + Math.floor(affinityDelta * 0.7)),
        intimacy: clamp01_100(relationship.intimacy + Math.floor(affinityDelta * 0.6)),
      },
      select: {
        id: true,
        familiarity: true,
        trust: true,
        intimacy: true,
        relationshipLevel: true,
      },
    });
  }

  if (selectedChoice?.reputation?.length && parsed.data.worldId) {
    const factions = await prisma.faction.findMany({
      where: {
        worldId: parsed.data.worldId,
        slug: { in: selectedChoice.reputation.map((r) => r.factionSlug) },
      },
      select: { id: true, slug: true },
    });
    for (const update of selectedChoice.reputation) {
      const faction = factions.find((f) => f.slug === update.factionSlug);
      if (!faction) continue;
      const current = await prisma.userFactionReputation.findUnique({
        where: { userId_factionId: { userId: user.id, factionId: faction.id } },
        select: { id: true, reputation: true },
      });
      const nextRep = clamp01_100((current?.reputation ?? 50) + update.delta);
      await prisma.userFactionReputation.upsert({
        where: { userId_factionId: { userId: user.id, factionId: faction.id } },
        update: {
          reputation: nextRep,
          level: Math.max(1, Math.ceil(nextRep / 20)),
          metadata: {
            lastDialogueChoiceId: selectedChoice.id,
            worldId: parsed.data.worldId,
          },
        },
        create: {
          userId: user.id,
          factionId: faction.id,
          reputation: nextRep,
          level: Math.max(1, Math.ceil(nextRep / 20)),
          metadata: {
            lastDialogueChoiceId: selectedChoice.id,
            worldId: parsed.data.worldId,
          },
        },
      });
    }
  }

  return NextResponse.json({
    ok: true,
    currentNode,
    selectedChoice,
    nextNode,
    relationship,
  });
}
