// file: src/app/api/chat/suggestions/route.ts
import { NextResponse } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { getOpenAI } from "@/lib/openai";

export const runtime = "nodejs";

function getStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

function getString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function pickSuggestions(args: {
  traits: string[];
  personality: string;
  scene: string;
  familiarity: number;
  trust: number;
  intimacy: number;
  contentRating: ContentRating;
}) {
  const {
    traits,
    personality,
    scene,
    familiarity,
    trust,
    intimacy,
    contentRating,
  } = args;

  const t = traits.map((x) => x.toLowerCase());
  const p = personality.toLowerCase();

  const out: string[] = [];

  if (t.includes("witty") || t.includes("playful") || p.includes("playful")) {
    out.push("Try to surprise me.");
    out.push("You look like you're about to say something clever.");
  }

  if (t.includes("gentle") || t.includes("caring") || p.includes("warm")) {
    out.push("I like how calm this feels with you.");
    out.push("Tell me what you're noticing about me right now.");
  }

  if (
    t.includes("dominant") ||
    t.includes("assertive") ||
    p.includes("confident")
  ) {
    out.push("Take the lead for a second.");
    out.push("What do you want from this moment?");
  }

  if (t.includes("submissive") || t.includes("attentive")) {
    out.push("What would make you happiest right now?");
  }

  if (
    t.includes("mischievous") ||
    t.includes("teasing") ||
    p.includes("teasing")
  ) {
    out.push("You seem like trouble in the best way.");
    out.push("What kind of trouble are you in the mood for?");
  }

  if (scene) {
    out.push(`What does this place feel like to you?`);
  }

  if (familiarity < 15) {
    out.push("Tell me more about yourself.");
    out.push("What should I know about you first?");
  } else if (trust < 40) {
    out.push("What makes you feel comfortable with someone?");
    out.push("What kind of connection are you looking for?");
  } else if (intimacy < 60) {
    out.push("I want to understand you better.");
    out.push("What are you feeling right now?");
  } else {
    out.push("Stay with me for a minute.");
    out.push("What do you want me to notice about you?");
  }

  if (contentRating === ContentRating.ADULT) {
    out.push("What kind of tension are you feeling right now?");
  }

  out.push("I keep thinking about you. It's a little embarrassing how much.");
  out.push("I'm not sure what I want to say — I just know I wanted to be here, talking to you.");

  // Return 2 distinct drafts — take first 2 unique items
  return Array.from(new Set(out)).slice(0, 2);
}

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const companionId = url.searchParams.get("companionId") ?? "";

  if (!companionId) {
    return NextResponse.json(
      { error: "Missing companionId." },
      { status: 400 },
    );
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      OR: [{ ownerId: user.id }, { visibility: Visibility.PUBLIC }],
    },
    select: {
      id: true,
      contentRating: true,
      profile: true,
      conversations: {
        where: { userId: user.id },
        take: 1,
        select: {
          familiarity: true,
          trust: true,
          intimacy: true,
        },
      },
    },
  });

  if (!companion) {
    return NextResponse.json(
      { error: "Companion not found." },
      { status: 404 },
    );
  }

  if (
    companion.contentRating === ContentRating.ADULT &&
    !isAdultAllowed(user)
  ) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};

  const convo = companion.conversations[0];

  const suggestions = pickSuggestions({
    traits: getStringArray(profile.traits),
    personality: getString(profile.personality),
    scene: getString(profile.scene),
    familiarity: convo?.familiarity ?? 0,
    trust: convo?.trust ?? 0,
    intimacy: convo?.intimacy ?? 0,
    contentRating: companion.contentRating,
  });

  return NextResponse.json({ suggestions });
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const companionId: string = body?.companionId ?? "";
  const recentMessages: { role: string; content: string }[] = Array.isArray(body?.messages)
    ? body.messages
    : [];

  if (!companionId) {
    return NextResponse.json({ error: "Missing companionId." }, { status: 400 });
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      OR: [{ ownerId: user.id }, { visibility: Visibility.PUBLIC }],
    },
    select: {
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
  const personality = typeof profile.personality === "string" ? profile.personality : "";
  const scene = typeof profile.scene === "string" ? profile.scene : "";

  const last = recentMessages.slice(-12);
  const isAdult = companion.contentRating === ContentRating.ADULT;

  const systemPrompt = [
    `You are ghostwriting two different reply options for a user in a chat with ${companion.name}, an AI companion.`,
    personality ? `${companion.name}'s personality: ${personality}` : "",
    scene ? `Current scene: ${scene}` : "",
    isAdult
      ? "Adult and intimate themes are permitted. Suggestions can be sensual, flirtatious, or emotionally vulnerable depending on the conversation's direction."
      : "Keep suggestions warm and emotionally genuine, appropriate for a general audience.",
    "Write exactly 2 reply drafts the USER could send. Each draft should be 2–4 sentences — specific, emotionally genuine, and feel like something a real person would actually say.",
    "Draft A and Draft B must take meaningfully different angles: one might be more vulnerable or sincere, the other more playful or bold — or one might deepen the current thread while the other shifts it slightly.",
    "Do NOT write companion replies. Write USER replies — things the user would say TO the companion.",
    'Respond with valid JSON only: { "suggestions": ["draft A full text", "draft B full text"] }',
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...last.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: "Write 2 different reply drafts I could send right now, based on this conversation.",
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 400,
      temperature: 0.92,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const suggestions: string[] = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.filter((s: unknown) => typeof s === "string").slice(0, 2)
      : [];

    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ error: "Failed to generate suggestions." }, { status: 500 });
  }
}
