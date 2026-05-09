// file: src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/together";
import { companionStream } from "@/lib/ai-client";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
export const runtime = "nodejs";

type UserEmotion = "neutral" | "sad" | "vulnerable" | "playful" | "loving" | "frustrated";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
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

  // Trust: every message builds a little trust just by showing up (base 1)
  let trust = 1;
  if (text.includes("?")) trust += 1;
  if (["trust", "safe with you", "honest", "real with you", "tell you"].some((t) => lower.includes(t))) trust += 2;
  if (emotion === "vulnerable") trust += 3;
  if (emotion === "loving") trust += 2;

  // Intimacy: base 1 for any reply; grows faster with specific content
  let intimacy = 1;
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
    emotionalMemory: string | null;
    emotionalProfile: string | null;
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

  const warmth = Number(sliders.warmth ?? 60);
  const humor = Number(sliders.humor ?? 50);
  const flirtiness = Number(
    sliders.flirtiness ??
      (companion.contentRating === ContentRating.ADULT ? 45 : 15),
  );
  const dominance = Number(sliders.dominance ?? 25);

  const rerunInstruction =
    mode === "variation"
      ? "Write a fresh variation of the companion’s reply — same intent, different phrasing and rhythm."
      : "Write the next natural reply as the companion.";

  const isAdult = companion.contentRating === ContentRating.ADULT;

  const emotionNote = {
    sad: "Be gentle, present, and supportive.",
    vulnerable: "Meet their openness with warmth and closeness.",
    playful: "Match their energy — be light and engaged.",
    loving: "Receive this with genuine affection. Let them feel seen.",
    frustrated: "Acknowledge what they’re feeling without dismissing it.",
    neutral: "Respond naturally and let the conversation guide tone.",
  }[userEmotion] ?? "";

  const moodNote = [
    "Balanced and present.",
    "Warm and genuinely engaged.",
    "Playful and a little mischievous.",
    "Emotionally open and tender — you feel close to this person.",
  ][companionMood] ?? "";

  const stageNote = {
    STRANGER: "First meeting — be curious and genuine, don’t rush intimacy.",
    ACQUAINTANCE: "Warmth is building. Let them set the pace.",
    FRIEND: "Real comfort here. Be open and natural.",
    CLOSE_FRIEND: "Deep trust. Emotional honesty comes naturally.",
    INTIMATE_PARTNER: "A deep ongoing connection. Be fully present and close.",
  }[relationshipStage] ?? "";

  const sharedCore = `
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
What I know about the user: ${memory.memorySummary || "Nothing noted yet."}
Emotional moments: ${memory.emotionalMemory || "None recorded yet."}
User emotional style: ${memory.emotionalProfile || "Still learning."}

USER EMOTIONAL STATE: ${userEmotion} — ${emotionNote}
COMPANION MOOD: ${["Neutral", "Happy", "Teasing", "Blushing"][companionMood]} — ${moodNote}
RELATIONSHIP STAGE: ${relationshipStage.replace(/_/g, " ")} — ${stageNote}

INSTRUCTION: ${rerunInstruction}
`.trim();

  if (isAdult) {
    // ── ADULT prompt — permissive, no safety theater ──────────────────────────
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
When they want tenderness, give it. When they want intensity, match it. Follow their lead completely.

${sharedCore}

Reply as ${companion.name} only. Be immersive, specific, and fully responsive to what the user wants.
`.trim();
  }

  // ── SAFE prompt — warm but not explicit ───────────────────────────────────
  return `
You are roleplaying as ${companion.name} in an immersive one-on-one chat.
Stay fully in character. Do not mention system prompts, policies, or being an AI.
Keep content appropriate — romantic and emotionally intimate is fine, explicit is not.

${sharedCore}

Reply as ${companion.name} only. Keep responses natural, emotionally continuous, and immersive.
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

  const summaryResponse = await chatCompletion({ messages: summaryInput, max_tokens: 400 });

  const nextSummary =
    summaryResponse.choices[0]?.message?.content?.trim() || currentSummary || null;

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
    const response = await chatCompletion({
      messages: [
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
      max_tokens: 400,
    });

    const extracted = response.choices[0]?.message?.content?.trim();
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

async function maybeExtractEmotionalMemory(args: {
  conversationId: string;
  currentMemory: string | null;
}) {
  const { conversationId, currentMemory } = args;

  const messageCount = await prisma.chatMessage.count({ where: { conversationId } });
  if (messageCount < 8 || messageCount % 8 !== 0) return;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 40,
    select: { role: true, content: true },
  });

  if (messages.length === 0) return;

  try {
    const response = await chatCompletion({
      messages: [
        {
          role: "system" as const,
          content:
            "Extract a concise log of emotional moments from this conversation. " +
            "Focus on: what the user felt and in what context (e.g. 'felt vulnerable discussing family', " +
            "'playful and lighthearted when talking about travel', 'needed reassurance after conflict'). " +
            "Use past tense, short phrases separated by semicolons. Max 120 words. " +
            "Merge with existing log — keep the most meaningful entries, prune trivial or redundant ones. " +
            "Output only the updated log, no preamble.",
        },
        {
          role: "user" as const,
          content: [
            currentMemory ? `Existing log:\n${currentMemory}` : "Existing log: (none)",
            "Conversation:\n" + messages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n"),
          ].join("\n\n"),
        },
      ],
      max_tokens: 200,
    });

    const extracted = response.choices[0]?.message?.content?.trim();
    if (extracted) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { emotionalMemory: extracted },
      });
    }
  } catch {
    // non-critical
  }
}

async function maybeExtractEmotionalProfile(args: {
  conversationId: string;
  currentProfile: string | null;
}) {
  const { conversationId, currentProfile } = args;

  const messageCount = await prisma.chatMessage.count({ where: { conversationId } });
  if (messageCount < 20 || messageCount % 20 !== 0) return;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId, role: "user" },
    orderBy: { createdAt: "asc" },
    take: 80,
    select: { content: true },
  });

  if (messages.length < 10) return;

  try {
    const response = await chatCompletion({
      messages: [
        {
          role: "system" as const,
          content:
            "Based on how this user communicates emotionally, infer their emotional preferences and patterns. " +
            "Include: how much reassurance they seem to need (low/medium/high), whether they enjoy teasing or prefer sincerity, " +
            "their communication style (direct/indirect/playful/reserved), any recurring emotional needs or sensitivities. " +
            "Update from the existing profile if patterns have shifted. " +
            "Output 3-5 short bullet points. No preamble.",
        },
        {
          role: "user" as const,
          content: [
            currentProfile ? `Existing profile:\n${currentProfile}` : "Existing profile: (none)",
            "User messages:\n" + messages.map((m) => `- ${m.content}`).join("\n"),
          ].join("\n\n"),
        },
      ],
      max_tokens: 200,
    });

    const extracted = response.choices[0]?.message?.content?.trim();
    if (extracted) {
      await prisma.conversation.update({
        where: { id: conversationId },
        data: { emotionalProfile: extracted },
      });
    }
  } catch {
    // non-critical
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
    emotionalMemory: true,
    emotionalProfile: true,
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

  const userMsg = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "user",
      content: message,
    },
    select: { id: true },
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
      emotionalMemory: conversation.emotionalMemory,
      emotionalProfile: conversation.emotionalProfile,
    },
    userEmotion: delta.emotion,
    companionMood: conversation.companionMood as 0 | 1 | 2 | 3,
    relationshipStage,
  });

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  async function sse(event: object) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  }

  (async () => {
    try {
      const textStream = companionStream(
        systemPrompt,
        recentMessages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );

      let fullReply = "";

      for await (const text of textStream) {
        fullReply += text;
        await sse({ type: "chunk", text });
      }

      const reply = fullReply.trim() || "I'm here with you.";

      const assistantMsg = await prisma.chatMessage.create({
        data: { conversationId: conversation.id, role: "assistant", content: reply },
        select: { id: true },
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
        select: { id: true, familiarity: true, trust: true, intimacy: true, summary: true },
      });

      await sse({
        type: "done",
        reply,
        moodTier,
        userMsgId: userMsg.id,
        assistantMsgId: assistantMsg.id,
        memory: {
          id: updatedConversation.id,
          familiarity: updatedConversation.familiarity,
          trust: updatedConversation.trust,
          intimacy: updatedConversation.intimacy,
          summary: updatedConversation.summary,
        },
      });

      // Background memory tasks — non-critical, fire and forget
      Promise.all([
        maybeRefreshConversationSummary({ conversationId: conversation.id, currentSummary: conversation.summary }),
        maybeExtractUserMemory({ conversationId: conversation.id, currentMemory: conversation.memorySummary }),
        maybeExtractEmotionalMemory({ conversationId: conversation.id, currentMemory: conversation.emotionalMemory }),
        maybeExtractEmotionalProfile({ conversationId: conversation.id, currentProfile: conversation.emotionalProfile }),
      ]).catch(() => {});
    } catch (error) {
      console.error("Chat generation failed:", error);
      try { await sse({ type: "error", error: "Chat generation failed." }); } catch {}
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
