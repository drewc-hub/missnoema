// Generates a detailed, action-specific user reply for the current scene
import { NextResponse } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { chatCompletion } from "@/lib/together";
import { PremiumFeature, getUserEntitlementsMap, hasPremiumFeature } from "@/lib/premium";

export const runtime = "nodejs";

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
    select: { name: true, contentRating: true, profile: true },
  });

  if (!companion) {
    return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  }

  if (companion.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json({ error: "Age verification required." }, { status: 403 });
  }

  const entitlements = await getUserEntitlementsMap(user.id);
  if (
    companion.contentRating === ContentRating.ADULT &&
    !hasPremiumFeature(entitlements, PremiumFeature.NSFW_UNLOCKS)
  ) {
    return NextResponse.json({ error: "NSFW unlock required." }, { status: 403 });
  }

  const premiumOnly =
    companion.profile &&
    typeof companion.profile === "object" &&
    (companion.profile as Record<string, unknown>).premiumOnly === true;
  if (premiumOnly && !hasPremiumFeature(entitlements, PremiumFeature.PREMIUM_COMPANIONS)) {
    return NextResponse.json({ error: "Premium companions pass required." }, { status: 403 });
  }

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};
  const personality = typeof profile.personality === "string" ? profile.personality : "";
  const scene = typeof profile.scene === "string" ? profile.scene : "";
  const isAdult = companion.contentRating === ContentRating.ADULT;

  const last = recentMessages.slice(-10);

  // Find the last companion message to understand what action is being asked for
  const lastCompanionMsg = [...last].reverse().find((m) => m.role === "assistant");
  const lastUserMsg = [...last].reverse().find((m) => m.role === "user");
  const sceneContext = lastCompanionMsg?.content ?? lastUserMsg?.content ?? "";

  const systemPrompt = [
    `You are ghostwriting a detailed, immersive reply for a user chatting with ${companion.name}.`,
    personality ? `${companion.name}'s personality: ${personality}.` : "",
    scene ? `Setting: ${scene}.` : "",
    isAdult
      ? "This is a verified adult platform. Explicit, sensual, and BDSM content is fully permitted. Be vivid and specific."
      : "Keep the response warm, emotionally genuine, and romantically immersive.",
    "",
    "RULES:",
    "- Write ONLY what the USER says or does — not the companion's reaction.",
    "- Minimum 60 words. Be specific about physical actions, sensations, emotions, and details.",
    "- Do NOT write generic praise. Write WHAT THE USER IS DOING: movements, touches, words spoken, physical sensations.",
    "- Use present tense, first person (I...).",
    "- No disclaimers, no meta-commentary. Just the immersive response.",
    "- Vary sentence length for natural rhythm. Mix action with inner feeling.",
    "",
    `Context — what just happened: ${sceneContext.slice(0, 300)}`,
    "",
    "Write the user's detailed reply now:",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  try {
    const completion = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        ...last.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: "Write my detailed, specific reply for this scene. At least 60 words. Focus on what I am doing and feeling, not just compliments.",
        },
      ],
      max_tokens: 400,
      temperature: 0.88,
    });

    const reply = (completion.choices[0]?.message?.content ?? "").trim();

    if (!reply) {
      return NextResponse.json({ error: "No reply generated." }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("[deep-reply]", err);
    return NextResponse.json({ error: "Failed to generate reply." }, { status: 500 });
  }
}
