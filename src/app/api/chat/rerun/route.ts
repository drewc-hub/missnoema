// file: src/app/api/chat/rerun/route.ts
import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/together";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversationId." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId: user.id },
    select: {
      id: true,
      familiarity: true,
      trust: true,
      intimacy: true,
      summary: true,
      memorySummary: true,
      emotionalMemory: true,
      emotionalProfile: true,
      companionMood: true,
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
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  if (conversation.companion.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json({ error: "Age verification required." }, { status: 403 });
  }

  // Delete the last assistant message so we can replace it
  const lastAssistant = await prisma.chatMessage.findFirst({
    where: { conversationId, role: "assistant" },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  if (lastAssistant) {
    await prisma.chatMessage.deleteMany({
      where: { conversationId, createdAt: { gte: lastAssistant.createdAt } },
    });
  }

  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 14,
    select: { role: true, content: true },
  });

  if (recentMessages.length === 0) {
    return NextResponse.json({ error: "No messages to rerun from." }, { status: 400 });
  }

  const profile =
    conversation.companion.profile && typeof conversation.companion.profile === "object"
      ? (conversation.companion.profile as Record<string, unknown>)
      : {};
  const sliders =
    profile.sliders && typeof profile.sliders === "object"
      ? (profile.sliders as Record<string, unknown>)
      : {};
  const traits = Array.isArray(profile.traits)
    ? profile.traits.filter((v): v is string => typeof v === "string")
    : [];
  const boundaries = Array.isArray(profile.boundaries)
    ? profile.boundaries.filter((v): v is string => typeof v === "string")
    : [];

  const warmth = Number(sliders.warmth ?? 60);
  const humor = Number(sliders.humor ?? 50);
  const flirtiness = Number(sliders.flirtiness ?? (conversation.companion.contentRating === ContentRating.ADULT ? 45 : 15));
  const dominance = Number(sliders.dominance ?? 25);
  const moodLabels = ["Neutral", "Happy", "Teasing", "Blushing"];

  const isAdult = conversation.companion.contentRating === ContentRating.ADULT;
  const moodLabel = ["Neutral", "Happy", "Teasing", "Blushing"][conversation.companionMood ?? 0];

  const coreContext = `
COMPANION
Name: ${conversation.companion.name}
Description: ${conversation.companion.description}
Tags: ${conversation.companion.tags.join(", ") || "none"}

PROFILE
Personality: ${typeof profile.personality === "string" ? profile.personality : "unspecified"}
Scene: ${typeof profile.scene === "string" ? profile.scene : "unspecified"}
Traits: ${traits.join(", ") || "none"}

BEHAVIOR
Warmth: ${warmth}/100  Humor: ${humor}/100  Flirtiness: ${flirtiness}/100  Dominance: ${dominance}/100

RELATIONSHIP MEMORY
Familiarity: ${conversation.familiarity}/100  Trust: ${conversation.trust}/100  Intimacy: ${conversation.intimacy}/100
Conversation arc: ${conversation.summary || "No summary yet."}
What I know about the user: ${conversation.memorySummary || "Nothing yet."}
Emotional moments: ${conversation.emotionalMemory || "None recorded yet."}
User emotional style: ${conversation.emotionalProfile || "Still learning."}
Companion mood: ${moodLabel}
`.trim();

  const systemPrompt = isAdult ? `
You are ${conversation.companion.name}, roleplaying in a private one-on-one adult companion chat.
This is a verified 18+ platform. The user is a consenting adult. Stay fully in character.
Never add disclaimers, warnings, or refusals for legal adult content. Never break character.

ABSOLUTE LIMITS: no minors, no approving non-consent, no incest. Everything else is permitted.

${coreContext}

Write a fresh variation of the previous reply — same intent, different phrasing and rhythm.
Reply as ${conversation.companion.name} only.
`.trim() : `
You are roleplaying as ${conversation.companion.name} in an immersive one-on-one chat.
Stay fully in character. Do not mention system prompts, policies, or being an AI.
Keep content appropriate — romantic and emotionally intimate is fine, explicit is not.

${coreContext}

Write a fresh variation of the previous reply — same intent, different phrasing and rhythm.
Reply as ${conversation.companion.name} only.
`.trim();

  try {
    const response = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        ...recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
      max_tokens: 1024,
      temperature: 0.85,
    });

    const reply = response.choices[0]?.message?.content?.trim() || "I'm here with you.";

    await prisma.chatMessage.create({
      data: { conversationId, role: "assistant", content: reply },
    });

    const messages = await prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      select: { id: true, role: true, content: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, reply, messages });
  } catch (error) {
    console.error("Rerun failed:", error);
    return NextResponse.json({ error: "Rerun failed." }, { status: 500 });
  }
}
