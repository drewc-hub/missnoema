// file: src/app/api/chat/suggestions/route.ts
import { NextResponse } from "next/server";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

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

  if (familiarity < 10) {
    out.push("Tell me more about yourself.");
    out.push("What should I know about you first?");
  } else if (trust < 20) {
    out.push("What makes you feel comfortable with someone?");
    out.push("What kind of connection are you looking for?");
  } else if (intimacy < 25) {
    out.push("I want to understand you better.");
    out.push("What are you feeling right now?");
  } else {
    out.push("Stay with me for a minute.");
    out.push("What do you want me to notice about you?");
  }

  if (contentRating === ContentRating.ADULT) {
    out.push("What kind of tension are you feeling right now?");
  }

  out.push("What are you thinking right now?");
  out.push("Tell me more.");

  return Array.from(new Set(out)).slice(0, 6);
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
      ownerId: user.id,
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
