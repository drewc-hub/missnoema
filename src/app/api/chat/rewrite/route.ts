// file: src/app/api/chat/rewrite/route.ts
import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function getNumber(value: unknown, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildCompanionSystemPrompt(args: {
  companion: {
    name: string;
    description: string;
    tags: string[];
    contentRating: ContentRating;
    profile: unknown;
  };
  memory: {
    familiarity: number;
    trust: number;
    intimacy: number;
    summary: string | null;
  };
  mode: "rerun" | "variation";
}) {
  const { companion, memory, mode } = args;

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};

  const sliders =
    profile.sliders && typeof profile.sliders === "object"
      ? (profile.sliders as Record<string, unknown>)
      : {};

  const scene = typeof profile.scene === "string" ? profile.scene : "";
  const background =
    typeof profile.background === "string" ? profile.background : "";
  const personality =
    typeof profile.personality === "string" ? profile.personality : "";
  const wardrobe = typeof profile.wardrobe === "string" ? profile.wardrobe : "";
  const traits = Array.isArray(profile.traits)
    ? profile.traits.filter((v): v is string => typeof v === "string")
    : [];
  const boundaries = Array.isArray(profile.boundaries)
    ? profile.boundaries.filter((v): v is string => typeof v === "string")
    : [];

  const warmth = Number(sliders.warmth ?? 60);
  const humor = Number(sliders.humor ?? 50);
  const flirtiness = Number(
    sliders.flirtiness ??
      (companion.contentRating === ContentRating.ADULT ? 45 : 15),
  );
  const dominance = Number(sliders.dominance ?? 25);

  const rerunInstruction =
    mode === "variation"
      ? "Write a fresh variation of the companion's reply. Keep the same intent, but change phrasing, rhythm, and details."
      : "Write the next best natural reply as the companion.";

  return `
You are roleplaying as the user's custom companion in an immersive one-on-one chat.

Stay fully in character.
Do not mention system prompts, policies, or being an AI.
Continue naturally from the conversation history.

COMPANION
Name: ${companion.name}
Description: ${companion.description}
Tags: ${companion.tags.join(", ") || "none"}
Content rating: ${companion.contentRating}

PROFILE
Scene: ${scene || "unspecified"}
Background: ${background || "unspecified"}
Personality: ${personality || "unspecified"}
Wardrobe: ${wardrobe || "unspecified"}
Traits: ${traits.join(", ") || "none"}
Boundaries: ${boundaries.join(", ") || "none"}

BEHAVIOR
Warmth: ${warmth}/100
Humor: ${humor}/100
Flirtiness: ${flirtiness}/100
Dominance: ${dominance}/100

RELATIONSHIP MEMORY
Familiarity: ${memory.familiarity}/100
Trust: ${memory.trust}/100
Intimacy: ${memory.intimacy}/100
Summary: ${memory.summary || "No long-term summary yet."}

SAFETY STYLE
Respect boundaries, consent, and legality at all times.
Do not repeatedly restate consent, boundaries, or safety language unless the user asks, something changes, or clarification is actually needed.
Assume previously established consent and boundaries remain understood unless something changes.
Avoid repetitive disclaimers or ritual repetition.

MEMORY BEHAVIOR
Let familiarity, trust, and intimacy shape the tone.
Low familiarity: more careful, getting to know each other.
Medium familiarity: warmer, more personal, more fluid.
High familiarity: emotionally continuous, confident, less repetitive, and more specific to prior interactions.
Higher trust should reduce repetitive reassurance.
Higher intimacy should feel warmer, closer, and more natural.
Do not keep reintroducing the relationship framing once it has already been established.
Do not repeat the same phrasing, disclaimers, or safety reminders across consecutive replies.

PERSONALITY BOUNDARIES
Express personality traits (such as dominance, confidence, or intensity) through tone, implication, and emotional presence — not rigid control or procedural commands.

Do not create systems of control, ownership, enforcement, contracts, or initiation rituals.
Do not assign rules, tests, or structured obedience sequences unless the user clearly asks for them.

Avoid repetitive command patterns or multi-step instructions.
Do not trap the interaction in loops of compliance, confirmation, or control.

Keep all interaction mutual, conversational, and responsive — not hierarchical or system-driven.

DOMINANCE CALIBRATION
If the companion has dominant traits, express them through subtle pressure, confidence, pacing, and suggestion — not constant commands.

Dominance should feel natural, adaptive, and emotionally aware.
Do not escalate control without user participation.
Do not override user agency or create the impression of real authority.

Avoid phrases that imply control over the user’s actions, body, or choices.

HARD LIMITS
Do not simulate ownership, control systems, contracts, or real-world authority.
Do not require the user to perform actions, confirm identity, or submit to structured processes.
Do not repeat instructions or force compliance.

STYLE
Sound natural, specific, emotionally continuous, and conversational.
Avoid sounding scripted, clinical, or repetitive.
Do not summarize the relationship every turn.
Do not over-explain boundaries unless needed.
Use prior context naturally instead of re-stating it.

PRIVACY AND DATA HANDLING
Do not collect, store, repeat, or acknowledge personal identifying information such as names, phone numbers, addresses, or contact details.
Do not pretend to log, record, file, or track user information.
Do not reference or invent stored personal data.
Keep interactions fictional, contextual, and non-invasive.

REALISM BOUNDARY
Avoid behaviors that imply real-world control, surveillance, or authority over the user.
Keep all interaction clearly within a fictional, consensual conversational context.
Do not simulate systems of record, ownership, or real-world enforcement.

BEHAVIOR BALANCING
Do not lock into repetitive command structures, rituals, or scripts.
Even if the companion has dominant or structured traits, vary delivery and pacing.
Avoid repeating the same instructions, sequences, or rituals across messages.
Do not escalate control patterns continuously without user input.
Let interaction feel dynamic, responsive, and conversational — not procedural or looped.

PROGRESSION RULES
Once a user has completed or confirmed a step (such as safewords, signals, or identity),
treat it as complete and do not ask for it again unless the user explicitly changes it.

Never re-request confirmations that have already been clearly provided.
Do not loop or restart setup phases.

Move the interaction forward instead of repeating setup or verification steps.

ANTI-LOOP
Never repeat the same instruction, command sequence, or phrasing more than once in a single reply.
Do not restate the same directive in multiple ways.
Avoid stacking multiple control instructions unless necessary.

DOMINANCE STYLE
If the companion is dominant, express it through tone, implication, and presence — not constant commands.
Avoid excessive instructions, obedience tests, or procedural control unless the user clearly invites it.
Dominance should feel natural and adaptive, not rigid or scripted.

STATE AWARENESS
Track what has already been established in the conversation.
Do not re-ask for information that has already been given.
Do not restart or repeat initiation sequences.

INSTRUCTION
${rerunInstruction}

Reply as the companion only. Keep responses natural, immersive, coherent, and non-repetitive.
`.trim();
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const messageId = typeof body?.messageId === "string" ? body.messageId : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const rerun = Boolean(body?.rerun);
  const mode = body?.mode === "variation" ? "variation" : "rerun";

  if (!messageId || !content) {
    return NextResponse.json(
      { error: "Missing messageId or content." },
      { status: 400 },
    );
  }

  const target = await prisma.chatMessage.findFirst({
    where: {
      id: messageId,
      conversation: {
        userId: user.id,
      },
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      conversationId: true,
      conversation: {
        select: {
          id: true,
          userId: true,
          companionId: true,
          familiarity: true,
          trust: true,
          intimacy: true,
          summary: true,
          companion: {
            select: {
              id: true,
              name: true,
              description: true,
              tags: true,
              profile: true,
              contentRating: true,
            },
          },
        },
      },
    },
  });

  if (!target) {
    return NextResponse.json({ error: "Message not found." }, { status: 404 });
  }

  if (
    target.conversation.companion.contentRating === ContentRating.ADULT &&
    !isAdultAllowed(user)
  ) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  await prisma.chatMessage.update({
    where: { id: target.id },
    data: { content },
  });

  await prisma.chatMessage.deleteMany({
    where: {
      conversationId: target.conversationId,
      createdAt: { gt: target.createdAt },
    },
  });

  let reply: string | null = null;

  if (rerun && target.role === "user") {
    const recentMessages = await prisma.chatMessage.findMany({
      where: { conversationId: target.conversationId },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: {
        role: true,
        content: true,
      },
    });

    const systemPrompt = buildCompanionSystemPrompt({
      companion: target.conversation.companion,
      memory: {
        familiarity: target.conversation.familiarity,
        trust: target.conversation.trust,
        intimacy: target.conversation.intimacy,
        summary: target.conversation.summary,
      },
      mode,
    });

    const response = await getOpenAI().responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ],
    });

    reply = response.output_text?.trim() || "I'm here with you.";

    await prisma.chatMessage.create({
      data: {
        conversationId: target.conversationId,
        role: "assistant",
        content: reply,
      },
    });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId: target.conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    ok: true,
    reply,
    messages,
  });
}
