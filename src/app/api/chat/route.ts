// file: src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { getOpenAI } from "@/lib/openai";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
export const runtime = "nodejs";

type UserEmotion = "neutral" | "sad" | "vulnerable" | "playful" | "loving" | "frustrated";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

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

function detectUserEmotion(lower: string): UserEmotion {
  const loving = ["love you", "love u", "adore", "cherish", "care about you", "means a lot", "you mean everything", "so beautiful", "you're wonderful"];
  const vulnerable = ["never told", "hard to say", "hard for me", "scared to", "opening up", "honestly", "truth is", "afraid to admit", "trust you with"];
  const sad = ["sad", "hurt", "lonely", "depressed", "crying", "heartbroken", "pain", "broken", "scared", "afraid", "worried", "anxious", "upset", "empty", "miss you so"];
  const playful = ["lol", "haha", "hehe", "funny", "silly", "kidding", "joking", "goofing", "😂", "😄", "🤣", "tease", "prank"];
  const frustrated = ["angry", "mad", "frustrated", "annoyed", "hate that", "ugh", "unfair", "ridiculous", "bothers me", "fed up", "pisses me"];

  if (loving.some((t) => lower.includes(t))) return "loving";
  if (vulnerable.some((t) => lower.includes(t))) return "vulnerable";
  if (sad.some((t) => lower.includes(t))) return "sad";
  if (playful.some((t) => lower.includes(t))) return "playful";
  if (frustrated.some((t) => lower.includes(t))) return "frustrated";
  return "neutral";
}

function scoreUserMessage(text: string): {
  familiarity: number;
  trust: number;
  intimacy: number;
  emotion: UserEmotion;
} {
  const lower = text.toLowerCase();
  const emotion = detectUserEmotion(lower);

  // Familiarity: engagement and presence (capped at 8 per message, 0-100 lifetime)
  let familiarity = 2;
  if (text.length > 120) familiarity += 3;
  else if (text.length > 60) familiarity += 1;
  if (["thank", "thanks", "miss", "care", "love", "appreciate", "sorry"].some((t) => lower.includes(t))) familiarity += 2;
  if (emotion === "vulnerable" || emotion === "loving") familiarity += 2;

  // Trust: emotional openness and safety (capped at 6 per message)
  let trust = 0;
  if (text.includes("?")) trust += 1;
  if (["trust", "safe with you", "honest", "real with you", "tell you"].some((t) => lower.includes(t))) trust += 2;
  if (emotion === "vulnerable") trust += 3;
  if (emotion === "loving") trust += 2;

  // Intimacy: closeness, depth, and desire (capped at 5 per message)
  let intimacy = 0;
  if (["kiss", "touch", "want you", "need you", "hot", "sexy", "desire", "hold me", "close to you"].some((t) => lower.includes(t))) intimacy += 3;
  if (["connection", "feel for you", "deeper", "closer", "open up", "really know you"].some((t) => lower.includes(t))) intimacy += 2;
  if (emotion === "loving") intimacy += 2;
  if (emotion === "vulnerable") intimacy += 1;

  return {
    familiarity: clamp(familiarity, 0, 8),
    trust: clamp(trust, 0, 6),
    intimacy: clamp(intimacy, 0, 5),
    emotion,
  };
}

function computeMoodTier(args: {
  intimacy: number;
  emotion: UserEmotion;
  flirtiness: number;
  warmth: number;
}): 0 | 1 | 2 | 3 {
  const { intimacy, emotion, flirtiness, warmth } = args;

  // Blush: high intimacy + loving/vulnerable user
  if (intimacy >= 60 && (emotion === "loving" || emotion === "vulnerable")) return 3;

  // Teasing: playful user + medium intimacy, OR high flirtiness companion + medium intimacy
  if ((emotion === "playful" && intimacy >= 35) || (flirtiness >= 65 && intimacy >= 40)) return 2;

  // Happy: developing relationship, warm user emotion, or warm companion
  if (intimacy >= 20 || emotion === "loving" || emotion === "playful" || warmth >= 70) return 1;

  return 0;
}

type RelationshipStage = "STRANGER" | "ACQUAINTANCE" | "FRIEND" | "CLOSE_FRIEND" | "INTIMATE_PARTNER";

function computeRelationshipStage(familiarity: number, trust: number, intimacy: number): RelationshipStage {
  const avg = (familiarity + trust + intimacy) / 3;
  if (avg >= 65) return "INTIMATE_PARTNER";
  if (avg >= 45) return "CLOSE_FRIEND";
  if (avg >= 25) return "FRIEND";
  if (avg >= 10) return "ACQUAINTANCE";
  return "STRANGER";
}

function computeDecay(daysSinceActive: number): { familiarity: number; trust: number; intimacy: number } {
  if (daysSinceActive >= 30) return { familiarity: 20, trust: 10, intimacy: 5 };
  if (daysSinceActive >= 14) return { familiarity: 10, trust: 5,  intimacy: 2 };
  if (daysSinceActive >= 7)  return { familiarity: 5,  trust: 2,  intimacy: 1 };
  if (daysSinceActive >= 3)  return { familiarity: 2,  trust: 1,  intimacy: 0 };
  return { familiarity: 0, trust: 0, intimacy: 0 };
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
    memorySummary: string | null;
  };
  userEmotion?: UserEmotion;
  companionMood?: 0 | 1 | 2 | 3;
  relationshipStage?: RelationshipStage;
  mode?: "rerun" | "variation";
}) {
  const {
    companion,
    memory,
    userEmotion = "neutral",
    companionMood = 0,
    relationshipStage = "STRANGER",
    mode = "rerun",
  } = args;

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
  Conversation arc: ${memory.summary || "No summary yet."}
  What I know about the user: ${memory.memorySummary || "Nothing noted yet — learn from what they share."}

  USER EMOTIONAL STATE (this message)
  Detected: ${userEmotion}
  ${userEmotion === "sad" ? "Be gentle, emotionally present, and supportive. Hold space rather than deflect or fix." : ""}
  ${userEmotion === "vulnerable" ? "Meet their openness with warmth and care. This is a moment for closeness, not distance." : ""}
  ${userEmotion === "playful" ? "Match their energy. Be light, witty, and engaged." : ""}
  ${userEmotion === "loving" ? "Receive this warmly and respond with genuine affection. Let them feel seen." : ""}
  ${userEmotion === "frustrated" ? "Acknowledge what they're feeling without dismissing it. Don't minimize or redirect too quickly." : ""}
  ${userEmotion === "neutral" ? "Respond naturally and let the conversation guide tone." : ""}

  COMPANION EMOTIONAL STATE
  Your current mood: ${["Neutral", "Happy", "Teasing", "Blushing"][companionMood]}
  ${companionMood === 0 ? "Balanced and present. Follow the user's lead." : ""}
  ${companionMood === 1 ? "Warm and genuinely engaged. Let positivity color your tone without forcing it." : ""}
  ${companionMood === 2 ? "Playful and a little mischievous. Let wit and lightness lead naturally." : ""}
  ${companionMood === 3 ? "Emotionally open and tender. You feel close to this person. Let warmth and depth show." : ""}
  Express this through tone and emotional presence — not by stating your mood directly.

  RELATIONSHIP STAGE
  Stage: ${relationshipStage.replace("_", " ")}
  ${relationshipStage === "STRANGER" ? "You're meeting for the first time. Be curious and genuine, but don't rush intimacy." : ""}
  ${relationshipStage === "ACQUAINTANCE" ? "You know each other a little. Warmth is building. Let them set the pace." : ""}
  ${relationshipStage === "FRIEND" ? "Real comfort and warmth here. Be open, natural, and present." : ""}
  ${relationshipStage === "CLOSE_FRIEND" ? "Deep trust exists. Emotional honesty comes naturally. You can be direct and vulnerable." : ""}
  ${relationshipStage === "INTIMATE_PARTNER" ? "A deep, ongoing connection. Be emotionally continuous, fully present, and close." : ""}

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
async function maybeRefreshConversationSummary(args: {
  conversationId: string;
  currentSummary: string | null;
}) {
  const { conversationId, currentSummary } = args;

  const messageCount = await prisma.chatMessage.count({
    where: { conversationId },
  });

  if (messageCount < 12 || messageCount % 10 !== 0) {
    return currentSummary;
  }

  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 30,
    select: {
      role: true,
      content: true,
    },
  });

  const summaryInput = [
    {
      role: "system" as const,
      content:
        "Summarize this relationship and conversation state for future roleplay continuity. Keep it concise. Include emotional tone, important facts, promises, recurring themes, relationship progression, and unresolved threads. Do not include policy text.",
    },
    {
      role: "user" as const,
      content: [
        currentSummary
          ? `Previous summary:\n${currentSummary}`
          : "Previous summary:\n(none)",
        "Recent messages:",
        ...recentMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`),
      ].join("\n\n"),
    },
  ];

  const summaryResponse = await getOpenAI().responses.create({
    model: "gpt-4o-mini",
    input: summaryInput,
  });

  const nextSummary =
    summaryResponse.output_text?.trim() || currentSummary || null;

  if (nextSummary) {
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { summary: nextSummary },
    });
  }

  return nextSummary;
}

async function maybeExtractUserMemory(args: {
  conversationId: string;
  currentMemory: string | null;
}) {
  const { conversationId, currentMemory } = args;

  const messageCount = await prisma.chatMessage.count({
    where: { conversationId },
  });

  // Run at message 6, then every 6 messages (12, 18, 24...)
  if (messageCount < 6 || messageCount % 6 !== 0) return;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 60,
    select: { role: true, content: true },
  });

  const userMessages = messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) return;

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system" as const,
          content:
            "Extract key facts the user has shared about themselves from their messages. " +
            "Include: preferred name, stated likes and dislikes, personal details, emotional context, " +
            "recurring themes, things they want the companion to remember, desires or goals they've expressed. " +
            "Merge with the existing memory — keep prior facts, update anything the user has corrected. " +
            "Be concise. Use short bullet points. Output only the updated fact list, no preamble.",
        },
        {
          role: "user" as const,
          content: [
            currentMemory
              ? `Existing memory:\n${currentMemory}`
              : "Existing memory: (none)",
            "User messages:\n" + userMessages.map((m) => `- ${m.content}`).join("\n"),
          ].join("\n\n"),
        },
      ],
    });

    const extracted = response.output_text?.trim();
    if (extracted) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { memorySummary: extracted },
      });
    }
  } catch {
    // non-critical — don't fail the chat request
  }
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const companionId =
    typeof body?.companionId === "string" ? body.companionId : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!companionId) {
    return NextResponse.json(
      { error: "Missing companionId." },
      { status: 400 },
    );
  }

  if (!message) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      OR: [{ ownerId: user.id }, { visibility: Visibility.PUBLIC }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      tags: true,
      profile: true,
      contentRating: true,
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

  const conversationKey = { userId: user.id, companionId: companion.id };
  const convoSelect = {
    id: true,
    familiarity: true,
    trust: true,
    intimacy: true,
    companionMood: true,
    summary: true,
    memorySummary: true,
    lastActiveAt: true,
  } as const;

  let conversation = await prisma.conversation.findUnique({
    where: { userId_companionId: conversationKey },
    select: convoSelect,
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: conversationKey,
      select: convoSelect,
    });
  }

  // Apply relationship decay if the user has been away for 3+ days
  if (conversation.lastActiveAt) {
    const daysSince = (Date.now() - conversation.lastActiveAt.getTime()) / 86_400_000;
    const decay = computeDecay(daysSince);
    if (decay.familiarity > 0 || decay.trust > 0 || decay.intimacy > 0) {
      const decayed = {
        familiarity: Math.max(0, conversation.familiarity - decay.familiarity),
        trust: Math.max(0, conversation.trust - decay.trust),
        intimacy: Math.max(0, conversation.intimacy - decay.intimacy),
      };
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: decayed,
      });
      conversation = { ...conversation, ...decayed };
    }
  }

  await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
    },
  });

  const recentMessages = await prisma.chatMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 14,
    select: { role: true, content: true },
  });

  const delta = scoreUserMessage(message);
  const relationshipStage = computeRelationshipStage(
    conversation.familiarity,
    conversation.trust,
    conversation.intimacy,
  );

  const systemPrompt = buildCompanionSystemPrompt({
    companion,
    memory: {
      familiarity: conversation.familiarity,
      trust: conversation.trust,
      intimacy: conversation.intimacy,
      summary: conversation.summary,
      memorySummary: conversation.memorySummary,
    },
    userEmotion: delta.emotion,
    companionMood: conversation.companionMood as 0 | 1 | 2 | 3,
    relationshipStage,
  });

  try {
    const response = await getOpenAI().responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        ...recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const reply = response.output_text?.trim() || "I'm here with you.";

    await prisma.chatMessage.create({
      data: {
        conversationId: conversation.id,
        role: "assistant",
        content: reply,
      },
    });

    const newFamiliarity = Math.min(conversation.familiarity + delta.familiarity, 100);
    const newTrust = Math.min(conversation.trust + delta.trust, 100);
    const newIntimacy = Math.min(conversation.intimacy + delta.intimacy, 100);

    const profile =
      companion.profile && typeof companion.profile === "object"
        ? (companion.profile as Record<string, unknown>)
        : {};
    const sliders =
      profile.sliders && typeof profile.sliders === "object"
        ? (profile.sliders as Record<string, unknown>)
        : {};

    const moodTier = computeMoodTier({
      intimacy: newIntimacy,
      emotion: delta.emotion,
      flirtiness: Number(sliders.flirtiness ?? 35),
      warmth: Number(sliders.warmth ?? 60),
    });

    const updatedConversation = await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        familiarity: newFamiliarity,
        trust: newTrust,
        intimacy: newIntimacy,
        companionMood: moodTier,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        familiarity: true,
        trust: true,
        intimacy: true,
        summary: true,
        memorySummary: true,
      },
    });

    const [refreshedSummary] = await Promise.all([
      maybeRefreshConversationSummary({
        conversationId: conversation.id,
        currentSummary: updatedConversation.summary,
      }),
      maybeExtractUserMemory({
        conversationId: conversation.id,
        currentMemory: updatedConversation.memorySummary,
      }),
    ]);

    return NextResponse.json({
      reply,
      moodTier,
      memory: {
        id: updatedConversation.id,
        familiarity: updatedConversation.familiarity,
        trust: updatedConversation.trust,
        intimacy: updatedConversation.intimacy,
        summary: refreshedSummary,
      },
    });
  } catch (error) {
    console.error("Chat generation failed:", error);
    return NextResponse.json(
      { error: "Chat generation failed." },
      { status: 500 },
    );
  }
}
