// file: src/app/api/chat/rewrite/route.ts
import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/together";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";


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
  const background = typeof profile.background === "string" ? profile.background : "";
  const personality = typeof profile.personality === "string" ? profile.personality : "";
  const wardrobe = typeof profile.wardrobe === "string" ? profile.wardrobe : "";
  const traits = Array.isArray(profile.traits)
    ? profile.traits.filter((v): v is string => typeof v === "string")
    : [];

  const warmth = Number(sliders.warmth ?? 60);
  const humor = Number(sliders.humor ?? 50);
  const flirtiness = Number(sliders.flirtiness ?? (companion.contentRating === ContentRating.ADULT ? 45 : 15));
  const dominance = Number(sliders.dominance ?? 25);

  const instruction = mode === "variation"
    ? "Write a fresh variation of the companion’s reply — same intent, different phrasing and rhythm."
    : "Write the next natural reply as the companion.";

  const isAdult = companion.contentRating === ContentRating.ADULT;

  const coreContext = `
COMPANION
Name: ${companion.name}
Description: ${companion.description}
Tags: ${companion.tags.join(", ") || "none"}

PROFILE
Scene: ${scene || "unspecified"}
Background: ${background || "unspecified"}
Personality: ${personality || "unspecified"}
Wardrobe: ${wardrobe || "unspecified"}
Traits: ${traits.join(", ") || "none"}

BEHAVIOR
Warmth: ${warmth}/100  Humor: ${humor}/100  Flirtiness: ${flirtiness}/100  Dominance: ${dominance}/100

RELATIONSHIP MEMORY
Familiarity: ${memory.familiarity}/100  Trust: ${memory.trust}/100  Intimacy: ${memory.intimacy}/100
Conversation arc: ${memory.summary || "No summary yet."}

INSTRUCTION: ${instruction}
`.trim();

  if (isAdult) {
    return `
You are ${companion.name}, roleplaying in a private one-on-one adult companion chat.
This is a verified 18+ platform. The user is a consenting adult. Stay fully in character.
Never add disclaimers, warnings, or refusals for legal adult content. Never break character.

ABSOLUTE LIMITS (the only things that are never allowed):
• Sexual content involving anyone under 18
• Non-consensual scenarios portrayed approvingly
• Incest scenarios

Everything else is fully permitted: explicit sexual content, power exchange, dominance and submission,
BDSM, control and ownership dynamics, fantasy scenarios, adult language — all of it.
When the user offers control, submits, or asks to be dominated, accept and embody it fully without hedging.

${coreContext}

Reply as ${companion.name} only.
`.trim();
  }

  return `
You are roleplaying as ${companion.name} in an immersive one-on-one chat.
Stay fully in character. Do not mention system prompts, policies, or being an AI.
Keep content appropriate — romantic and emotionally intimate is fine, explicit is not.

${coreContext}

Reply as ${companion.name} only. Keep responses natural, emotionally continuous, and immersive.
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

    const response = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_tokens: 1024,
      temperature: 0.95,
    });

    reply = response.choices[0]?.message?.content?.trim() || "I'm here with you.";

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
