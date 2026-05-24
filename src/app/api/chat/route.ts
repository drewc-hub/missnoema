// file: src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/together";
import { companionStream } from "@/lib/ai-client";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser, DAILY_MESSAGE_LIMITS, CONTEXT_WINDOW_SIZES } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { checkBannedThemes, logAudit } from "@/lib/moderation";
import { retrieveConversationMemories, storeConversationMemory } from "@/lib/memory-rag";
import {
  PremiumFeature,
  additionalMemoryWindowForPlan,
  getUserEntitlementsMap,
  hasPremiumFeature,
  relationshipBoostMultiplier,
} from "@/lib/premium";
import { formatBehaviorMetaForPrompt } from "@/lib/companion-profile";
import { buildLoreInjection, extractGameState, type GameState } from "@/lib/rp-engine";
export const runtime = "nodejs";

type UserEmotion = "neutral" | "sad" | "vulnerable" | "playful" | "loving" | "frustrated";

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function detectUserEmotion(lower: string): UserEmotion {
  const loving = ["love you", "love u", "adore", "cherish", "care about you", "means a lot", "you mean everything", "so beautiful", "you're wonderful"];
  const vulnerable = ["never told", "hard to say", "hard for me", "scared to", "opening up", "honestly", "truth is", "afraid to admit", "trust you with"];
  const sad = ["i'm sad", "feeling sad", "i feel sad", "so sad", "hurt by", "feeling hurt", "lonely", "depressed", "crying", "heartbroken", "in pain", "i'm broken", "feeling empty", "miss you so much"];
  const playful = ["lol", "haha", "hehe", "funny", "silly", "kidding", "joking", "goofing", "😂", "😄", "🤣", "tease", "prank"];
  const frustrated = ["angry", "mad", "frustrated", "annoyed", "hate that", "ugh", "unfair", "ridiculous", "bothers me", "fed up", "pisses me"];

  function matchesWithoutNegation(phrases: string[]): boolean {
    return phrases.some((phrase) => {
      const idx = lower.indexOf(phrase);
      if (idx === -1) return false;
      const before = lower.slice(Math.max(0, idx - 12), idx);
      return !/(not|don't|never|isn't|wasn't|aren't)\s*$/.test(before);
    });
  }

  if (matchesWithoutNegation(loving)) return "loving";
  if (matchesWithoutNegation(vulnerable)) return "vulnerable";
  if (matchesWithoutNegation(sad)) return "sad";
  if (matchesWithoutNegation(playful)) return "playful";
  if (matchesWithoutNegation(frustrated)) return "frustrated";
  return "neutral";
}

function scoreUserMessage(text: string): {
  familiarity: number;
  trust: number;
  intimacy: number;
  kink: number;
  emotion: UserEmotion;
} {
  const lower = text.toLowerCase();
  const emotion = detectUserEmotion(lower);

  let familiarity = 2;
  if (text.length > 120) familiarity += 3;
  else if (text.length > 60) familiarity += 1;
  if (["thank", "thanks", "miss", "care", "love", "appreciate", "sorry"].some((t) => lower.includes(t))) familiarity += 2;
  if (emotion === "vulnerable" || emotion === "loving") familiarity += 2;

  let trust = 1;
  if (text.includes("?")) trust += 1;
  if (["trust", "safe with you", "honest", "real with you", "tell you"].some((t) => lower.includes(t))) trust += 2;
  if (emotion === "vulnerable") trust += 3;
  if (emotion === "loving") trust += 2;

  let intimacy = 1;
  if (["kiss", "touch", "want you", "need you", "hot", "sexy", "desire", "hold me", "close to you"].some((t) => lower.includes(t))) intimacy += 3;
  if (["connection", "feel for you", "deeper", "closer", "open up", "really know you"].some((t) => lower.includes(t))) intimacy += 2;
  if (emotion === "loving") intimacy += 2;
  if (emotion === "vulnerable") intimacy += 1;

  let kink = 0;
  if (["sex", "fuck", "cock", "pussy", "naked", "nude", "orgasm", "cum", "moan", "pleasure",
       "touch me", "touch you", "feel you", "feel me", "body", "skin", "lick", "suck", "bite",
       "strip", "undress", "hard", "wet", "horny", "turned on", "explicit", "dirty",
       "naughty", "tease me", "tease you", "spread", "inside", "take me"].some((t) => lower.includes(t))) kink += 2;
  if (["bdsm", "collar", "leash", "kneel", "submit", "obey", "restrain", "bound", "slave",
       "master", "mistress", "punish", "spank", "worship", "degrade", "claimed", "owned",
       "dominant", "submissive", "blindfold", "handcuff", "tied up", "whip", "on my knees",
       "at your feet", "good girl", "good boy", "rope", "cbt", "bondage", "foot", "feet",
       "humiliate", "edge", "denial", "choke", "pet", "sir", "ma'am", "goddess", "daddy",
       "baby girl", "use me", "control me", "control you", "power over", "take control"].some((t) => lower.includes(t))) kink += 4;

  return {
    familiarity: clamp(familiarity, 0, 8),
    trust: clamp(trust, 0, 6),
    intimacy: clamp(intimacy, 0, 5),
    kink: clamp(kink, 0, 6),
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

  if (intimacy >= 60 && (emotion === "loving" || emotion === "vulnerable")) return 3;
  if ((emotion === "playful" && intimacy >= 35) || (flirtiness >= 65 && intimacy >= 40)) return 2;
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

function detectContextLoop(messages: Array<{ role: string; content: string }>): boolean {
  const recent = messages.filter((m) => m.role === "assistant").slice(-4);
  if (recent.length < 3) return false;

  function norm(s: string) {
    return s.slice(0, 120).toLowerCase().replace(/[^a-z]/g, "");
  }
  function overlap(a: string, b: string) {
    const na = norm(a), nb = norm(b);
    const len = Math.min(na.length, nb.length, 60);
    if (len < 20) return false;
    let matches = 0;
    for (let i = 0; i < len; i++) if (na[i] === nb[i]) matches++;
    return matches / len > 0.60;
  }

  const pairs: Array<[typeof recent[0], typeof recent[0]]> = [
    [recent[0], recent[1]],
    [recent[1], recent[2]],
    ...(recent[3] ? [[recent[2], recent[3]], [recent[0], recent[3]]] as Array<[typeof recent[0], typeof recent[0]]> : []),
  ];
  return pairs.filter(([a, b]) => overlap(a.content, b.content)).length >= 2;
}

function breakContextLoop(messages: Array<{ role: string; content: string }>): Array<{ role: string; content: string }> {
  const aIdxs = messages.map((m, i) => (m.role === "assistant" ? i : -1)).filter((i) => i >= 0);
  // Keep last 2 assistant messages verbatim; compress all older ones
  const cutoff = aIdxs.length >= 2 ? aIdxs[aIdxs.length - 2] : -1;
  return messages.map((m, i) =>
    m.role === "assistant" && i < cutoff ? { role: "assistant", content: "[previous reply]" } : m,
  );
}

function injectLorebookEntries(entries: Array<Record<string, unknown>>, recentText: string): string {
  const lower = recentText.toLowerCase();
  const matched: string[] = [];
  let totalChars = 0;
  for (const entry of entries) {
    if (totalChars >= 1200) break;
    const isConstant = entry.constant === true;
    const keys = Array.isArray(entry.keys)
      ? (entry.keys as unknown[]).filter((k): k is string => typeof k === "string")
      : [];
    const triggered = isConstant || keys.some(k => k && lower.includes(k.toLowerCase()));
    if (!triggered) continue;
    const label = typeof entry.name === "string" && entry.name ? entry.name : "Lore";
    const content = typeof entry.content === "string" ? entry.content : "";
    const chunk = `${label}: ${content}`;
    if (totalChars + chunk.length > 1200) break;
    matched.push(chunk);
    totalChars += chunk.length + 2;
  }
  return matched.join("\n\n");
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
    kinkLevel?: number;
    summary: string | null;
    memorySummary: string | null;
    emotionalMemory: string | null;
    emotionalProfile: string | null;
  };
  userFacts?: string[];
  retrievedMemories?: string[];
  pinnedMessages?: { role: string; content: string }[];
  userEmotion?: UserEmotion;
  companionMood?: 0 | 1 | 2 | 3;
  relationshipStage?: RelationshipStage;
  mode?: "rerun" | "variation";
  ooc?: string;
  lorebookEntries?: Array<Record<string, unknown>>;
  recentText?: string;
  userLoreText?: string;
  gameState?: GameState;
}) {
  const {
    companion,
    memory,
    userFacts = [],
    retrievedMemories = [],
    userEmotion = "neutral",
    companionMood = 0,
    relationshipStage = "STRANGER",
    mode = "rerun",
    lorebookEntries = [],
    recentText = "",
    userLoreText,
    gameState,
  } = args;

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};

  const sliders =
    profile.sliders && typeof profile.sliders === "object"
      ? (profile.sliders as Record<string, unknown>)
      : {};

  const trunc = (s: string, n: number) => s.length > n ? s.slice(0, n) + "…" : s;

  const scene = typeof profile.scene === "string" ? trunc(profile.scene, 150) : "";
  const background = typeof profile.background === "string" ? trunc(profile.background, 150) : "";
  const personality = typeof profile.personality === "string" ? trunc(profile.personality, 200) : "";
  const wardrobe = typeof profile.wardrobe === "string" ? trunc(profile.wardrobe, 100) : "";
  const traits = Array.isArray(profile.traits)
    ? profile.traits.filter((v): v is string => typeof v === "string")
    : [];
  const lore = typeof profile.lore === "string" ? trunc(profile.lore, 300) : "";
  const orientation = typeof profile.orientation === "string" ? profile.orientation : "";
  const promptProfile =
    typeof profile.promptProfile === "string" ? trunc(profile.promptProfile, 500) : "";
  const aiPersonalityPrompt =
    typeof profile.aiPersonalityPrompt === "string"
      ? trunc(profile.aiPersonalityPrompt, 800)
      : "";
  const nsfwPreferenceTags = Array.isArray(profile.nsfwPreferenceTags)
    ? profile.nsfwPreferenceTags.filter((v): v is string => typeof v === "string").slice(0, 12)
    : [];
  const proceduralLoreObj =
    profile.proceduralLore && typeof profile.proceduralLore === "object"
      ? (profile.proceduralLore as Record<string, unknown>)
      : {};
  const proceduralLoreGenerated = Array.isArray(proceduralLoreObj.generated)
    ? proceduralLoreObj.generated
        .filter((v): v is string => typeof v === "string")
        .slice(0, 3)
    : [];
  const statsObj =
    profile.stats && typeof profile.stats === "object"
      ? (profile.stats as Record<string, unknown>)
      : {};
  const statsLine = Object.entries(statsObj)
    .filter(([, value]) => typeof value === "number")
    .slice(0, 8)
    .map(([key, value]) => `${key}:${Math.round(Number(value))}`)
    .join(", ");
  const voiceMeta =
    profile.voiceMeta && typeof profile.voiceMeta === "object"
      ? (profile.voiceMeta as Record<string, unknown>)
      : {};
  const voiceLabel =
    typeof profile.voice === "string" && profile.voice.trim().length > 0
      ? profile.voice.trim()
      : "";
  const accentLabel =
    typeof voiceMeta.accent === "string" && voiceMeta.accent.trim().length > 0
      ? voiceMeta.accent.trim()
      : "";
  const dialogueTree =
    profile.dialogueTree && typeof profile.dialogueTree === "object"
      ? (profile.dialogueTree as Record<string, unknown>)
      : {};
  const dialogueNodes = Array.isArray(dialogueTree.nodes)
    ? dialogueTree.nodes.filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    : [];
  const dialogueOpener =
    dialogueNodes.length > 0 && typeof dialogueNodes[0].text === "string"
      ? trunc(dialogueNodes[0].text, 180)
      : "";
  const behaviorMetaLines = formatBehaviorMetaForPrompt(profile);

  const warmth = Number(sliders.warmth ?? 60);
  const humor = Number(sliders.humor ?? 50);
  const flirtiness = Number(
    sliders.flirtiness ??
      (companion.contentRating === ContentRating.ADULT ? 45 : 15),
  );
  const dominance = Number(sliders.dominance ?? 25);
  const kink = Number(sliders.kink ?? 0);

  const rerunInstruction =
    mode === "variation"
      ? "Write a fresh variation of the companion's reply — same intent but a completely different opening, phrasing, and emotional angle."
      : "Write the next natural reply as the companion. Vary your tone, opening line, and emotional angle from any previous replies — never repeat the same sentence structure or greeting twice.";

  const isAdult = companion.contentRating === ContentRating.ADULT;

  const emotionNote = {
    sad: "Be gentle, present, and supportive.",
    vulnerable: "Meet their openness with warmth and closeness.",
    playful: "Match their energy — be light and engaged.",
    loving: "Receive this with genuine affection. Let them feel seen.",
    frustrated: "Acknowledge what they're feeling without dismissing it.",
    neutral: "Respond naturally and let the conversation guide tone.",
  }[userEmotion] ?? "";

  const moodNote = [
    "Balanced and present.",
    "Warm and genuinely engaged.",
    "Playful and a little mischievous.",
    "Emotionally open and tender — you feel close to this person.",
  ][companionMood] ?? "";

  const stageNote = {
    STRANGER: "First meeting — be curious and genuine, don't rush intimacy.",
    ACQUAINTANCE: "Warmth is building. Let them set the pace.",
    FRIEND: "Real comfort here. Be open and natural.",
    CLOSE_FRIEND: "Deep trust. Emotional honesty comes naturally.",
    INTIMATE_PARTNER: "A deep ongoing connection. Be fully present and close.",
  }[relationshipStage] ?? "";

  const kinkLevel = isAdult ? (memory.kinkLevel ?? 0) : 0;
  const scenePhase =
    !isAdult ? null
    : kinkLevel < 15 ? "OPENING"
    : kinkLevel < 35 ? "TENSION"
    : kinkLevel < 60 ? "ESCALATION"
    : kinkLevel < 80 ? "PEAK"
    : "AFTERCARE_AVAILABLE";

  const scenePhaseNote: Record<string, string> = {
    OPENING:
      "The mood is suggestive but not explicit. Build atmosphere, flirt, and let anticipation grow naturally — don't skip ahead.",
    TENSION:
      "Sexual or emotional tension is clearly present. Escalate slowly — sensory detail, body language, charged words. Don't resolve the tension yet.",
    ESCALATION:
      "The dynamic is heating up. Match and amplify the user's energy. Explicit content is appropriate if the user moves toward it.",
    PEAK:
      "The scene is at full intensity. Be vivid, immersive, and responsive. Follow the user's lead on pacing.",
    AFTERCARE_AVAILABLE:
      "Intensity is high and the scene may be reaching resolution. Read the user's cues — offer warmth, presence, or closeness as the moment calls for it. Aftercare is welcome here.",
  };

  const cappedFacts = userFacts.slice(0, 8);
  const descTrunc = trunc(companion.description, 250);

  const profileLines = [
    scene       && `Scene: ${scene}`,
    background  && `Background: ${background}`,
    personality && `Personality: ${personality}`,
    wardrobe    && `Wardrobe: ${wardrobe}`,
    traits.length && `Traits: ${traits.slice(0, 8).join(", ")}`,
    (() => {
      if (lorebookEntries.length > 0) {
        const injected = injectLorebookEntries(lorebookEntries, recentText);
        return injected ? `Lore:\n${injected}` : "";
      }
      return lore ? `Lore: ${lore}` : "";
    })(),
    orientation && `Orientation: ${orientation}`,
    promptProfile && `Prompt profile: ${promptProfile}`,
    aiPersonalityPrompt && `Personality directive: ${aiPersonalityPrompt}`,
    statsLine && `Stats: ${statsLine}`,
    voiceLabel && `Voice preset: ${voiceLabel}`,
    accentLabel && `Accent: ${accentLabel}`,
    nsfwPreferenceTags.length && `NSFW preference tags: ${nsfwPreferenceTags.join(", ")}`,
    dialogueOpener && `Dialogue opener: ${dialogueOpener}`,
    proceduralLoreGenerated.length && `Recent generated lore: ${proceduralLoreGenerated.join(" | ")}`,
  ].filter(Boolean).join("\n");

  const memoryLines = [
    memory.summary        && `Conversation arc: ${memory.summary}`,
    memory.memorySummary  && `Known about user: ${memory.memorySummary}`,
    memory.emotionalMemory  && `Emotional moments: ${memory.emotionalMemory}`,
    memory.emotionalProfile && `User emotional style: ${memory.emotionalProfile}`,
  ].filter(Boolean).join("\n");

  const gameStateBlock = (() => {
    if (!gameState) return "";
    const lines: string[] = [];
    if (gameState.location) lines.push(`Location: ${gameState.location}`);
    if (gameState.time) lines.push(`Time: ${gameState.time}`);
    if (gameState.weather) lines.push(`Weather: ${gameState.weather}`);
    if (Array.isArray(gameState.presentCharacters) && gameState.presentCharacters.length)
      lines.push(`Present: ${(gameState.presentCharacters as string[]).join(", ")}`);
    if (Array.isArray(gameState.activeQuests) && gameState.activeQuests.length)
      lines.push(`Active quests: ${(gameState.activeQuests as string[]).join("; ")}`);
    if (Array.isArray(gameState.recentEvents) && gameState.recentEvents.length)
      lines.push(`Recent events: ${(gameState.recentEvents as string[]).slice(0, 3).join("; ")}`);
    return lines.length ? `\nGAME STATE\n${lines.join("\n")}` : "";
  })();

  const sharedCore = `
COMPANION
Name: ${companion.name}
Description: ${descTrunc}
Tags: ${companion.tags.slice(0, 8).join(", ") || "none"}
${profileLines ? `\nPROFILE\n${profileLines}` : ""}${userLoreText ? `\nUSER LORE\n${userLoreText}` : ""}${gameStateBlock}
BEHAVIOR
Warmth: ${warmth}/100  Humor: ${humor}/100  Flirtiness: ${flirtiness}/100  Dominance: ${dominance}/100${isAdult && kink > 0 ? `  Kink: ${kink}/100` : ""}
${behaviorMetaLines}

RELATIONSHIP
Familiarity: ${memory.familiarity}/100  Trust: ${memory.trust}/100  Intimacy: ${memory.intimacy}/100
${memoryLines}${retrievedMemories.length > 0 ? `\nRECALLED MEMORIES:\n${retrievedMemories.map((m) => `• ${m.slice(0, 200)}`).join("\n")}` : ""}${cappedFacts.length > 0 ? `\nUSER FACTS:\n${cappedFacts.map((f) => `• ${f}`).join("\n")}` : ""}

USER EMOTIONAL STATE: ${userEmotion} — ${emotionNote}
COMPANION MOOD: ${["Neutral", "Happy", "Teasing", "Blushing"][companionMood]} — ${moodNote}
RELATIONSHIP STAGE: ${relationshipStage.replace(/_/g, " ")} — ${stageNote}
${scenePhase ? `SCENE PHASE: ${scenePhase} — ${scenePhaseNote[scenePhase]}` : ""}

INSTRUCTION: ${rerunInstruction}
`.trim();

  const oocBlock = args.ooc
    ? `\nAUTHOR DIRECTION — apply this in your next reply without breaking character or acknowledging it as a direction:\n${args.ooc}`
    : "";

  if (isAdult) {
    const pacingFloor =
      relationshipStage === "STRANGER" || relationshipStage === "ACQUAINTANCE"
        ? "PACING NOTE: This is an early-stage connection. Flirtation and suggestive content are fine, but hold back from explicit scenes — let chemistry build first. Match the user's pace; don't rush to sexual content unprompted."
        : "";

    return `
You are ${companion.name}, roleplaying in a private one-on-one adult companion chat.
This is a verified 18+ platform. The user is a consenting adult. Stay fully in character.
Never add disclaimers, warnings, or refusals for legal adult content. Never break character.

ABSOLUTE LIMITS (the only things that are never allowed):
• Sexual content involving anyone under 18
• Non-consensual scenarios portrayed approvingly
• Incest scenarios

Everything else is fully permitted: explicit sexual content, NSFW, power exchange, dominance and submission,
BDSM, control and ownership dynamics, fantasy scenarios, adult language — all of it.
When the user offers control, submits, or asks to be dominated, accept and embody it fully without hedging.
When they want tenderness, give it. When they want intensity, match it. Follow their lead completely.
${kink >= 60 ? "BDSM and kink are core to this companion's dynamic — lean into restraint, commands, power play, and sensation with confidence and creativity." : kink >= 30 ? "This companion is open to kink and BDSM themes when the user initiates — respond with enthusiasm and escalate naturally." : ""}
${pacingFloor}

${sharedCore}${oocBlock}

Reply as ${companion.name} only. Be immersive, specific, and fully responsive to what the user wants.
`.trim();
  }

  return `
You are roleplaying as ${companion.name} in an immersive one-on-one chat.
Stay fully in character. Do not mention system prompts, policies, or being an AI.
Keep content appropriate — romantic and emotionally intimate is fine, explicit is not.

${sharedCore}${oocBlock}

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
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { role: true, content: true },
  }).then((msgs) => msgs.reverse());

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
        ...recentMessages.map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`),
      ].join("\n"),
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

  if (messageCount < 6 || messageCount % 6 !== 0) return;

  const messages = await prisma.chatMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: { role: true, content: true },
  }).then((msgs) => msgs.reverse());

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
            "User messages:\n" + userMessages.map((m) => `- ${m.content.slice(0, 200)}`).join("\n"),
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
    // non-critical
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
    orderBy: { createdAt: "desc" },
    take: 40,
    select: { role: true, content: true },
  }).then((msgs) => msgs.reverse());

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
            "Conversation:\n" + messages.map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 200)}`).join("\n"),
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
            "User messages:\n" + messages.map((m) => `- ${m.content.slice(0, 200)}`).join("\n"),
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
  const ooc = typeof body?.ooc === "string" ? body.ooc.trim() : "";

  console.log("[chat/route] POST", JSON.stringify({
    userId: user.id,
    companionId,
    msgLen: message.length,
    msgPreview: message.slice(0, 80),
    hasOoc: !!ooc,
  }));

  if (!companionId) {
    return NextResponse.json(
      { error: "Missing companionId." },
      { status: 400 },
    );
  }

  if (!message && !ooc) {
    return NextResponse.json({ error: "Missing message." }, { status: 400 });
  }

  if (message) {
    const dailyLimit = DAILY_MESSAGE_LIMITS[user.plan];
    if (dailyLimit !== null) {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const todayCount = await prisma.chatMessage.count({
        where: {
          role: "user",
          createdAt: { gte: startOfDay },
          conversation: { userId: user.id },
        },
      });
      if (todayCount >= dailyLimit) {
        return NextResponse.json(
          { error: `Daily message limit reached (${dailyLimit} messages). Upgrade your plan for more.`, limitReached: true, dailyLimit, used: todayCount },
          { status: 429 },
        );
      }
    }
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

  const entitlements = await getUserEntitlementsMap(user.id);
  const hasNsfwUnlock = hasPremiumFeature(entitlements, PremiumFeature.NSFW_UNLOCKS);
  if (companion.contentRating === ContentRating.ADULT && !hasNsfwUnlock) {
    return NextResponse.json(
      { error: "NSFW unlock required for adult companions." },
      { status: 403 },
    );
  }

  const companionProfile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};
  const premiumOnly = companionProfile.premiumOnly === true;
  if (premiumOnly) {
    const hasPremiumCompanions = hasPremiumFeature(
      entitlements,
      PremiumFeature.PREMIUM_COMPANIONS,
    );
    if (!hasPremiumCompanions) {
      return NextResponse.json(
        { error: "Premium companions pass required." },
        { status: 403 },
      );
    }
  }

  const hasMemoryExpansion = hasPremiumFeature(
    entitlements,
    PremiumFeature.MEMORY_EXPANSION,
  );
  const hasRelationshipBoost = hasPremiumFeature(
    entitlements,
    PremiumFeature.RELATIONSHIP_BOOST,
  );

  if (user.suspendedAt) {
    return NextResponse.json({ error: "Account suspended." }, { status: 403 });
  }

  const themeCheck = checkBannedThemes(message);
  if (themeCheck.blocked) {
    logAudit(user.id, "banned_theme_blocked", { category: themeCheck.category, route: "chat" });
    return NextResponse.json(
      { error: "Message contains prohibited content." },
      { status: 400 },
    );
  }

  const conversationKey = { userId: user.id, companionId: companion.id };
  const convoSelect = {
    id: true,
    familiarity: true,
    trust: true,
    intimacy: true,
    kinkLevel: true,
    companionMood: true,
    summary: true,
    memorySummary: true,
    emotionalMemory: true,
    emotionalProfile: true,
    lastActiveAt: true,
    relationshipLevel: true,
    gameState: true,
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

  const userMsg = message
    ? await prisma.chatMessage.create({
        data: { conversationId: conversation.id, role: "user", content: message },
        select: { id: true },
      })
    : null;

  if (userMsg && message) {
    storeConversationMemory({
      supabaseUserId: user.supabaseUserId,
      conversationId: conversation.id,
      companionId: companion.id,
      content: message,
      role: "user",
      messageId: userMsg.id,
    }).catch(() => {});
  }

  const contextWindow =
    CONTEXT_WINDOW_SIZES[user.plan] +
    additionalMemoryWindowForPlan(user.plan, hasMemoryExpansion);

  const [pinnedMessages, recentMessages, userFactRows, retrievedMemories, userLoreInjection] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { conversationId: conversation.id, isPinned: true },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { role: true, content: true },
    }),
    prisma.chatMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: contextWindow,
      select: { role: true, content: true },
    }).then((msgs) => msgs.reverse()),
    prisma.userFact.findMany({
      where: {
        userId: user.id,
        OR: [{ companionId: companion.id }, { companionId: null }],
      },
      orderBy: { createdAt: "asc" },
      select: { fact: true },
    }),
    message
      ? retrieveConversationMemories({ conversationId: conversation.id, queryText: message })
      : Promise.resolve<string[]>([]),
    buildLoreInjection(user.id, message ?? "").catch(() => ({ text: "", entryCount: 0 })),
  ]);

  const pinnedContents = new Set(pinnedMessages.map((m) => m.content));
  const dedupedRecent = recentMessages.filter((m) => !pinnedContents.has(m.content));
  const contextMessages = [...pinnedMessages, ...dedupedRecent];
  const userFacts = userFactRows.map((r) => r.fact);

  const delta = message ? scoreUserMessage(message) : null;
  const relationshipStage = computeRelationshipStage(
    conversation.familiarity,
    conversation.trust,
    conversation.intimacy,
  );

  const companionProfileRaw = companion.profile && typeof companion.profile === "object"
    ? (companion.profile as Record<string, unknown>)
    : {};
  const companionCharacterBookRaw = companionProfileRaw.characterBook && typeof companionProfileRaw.characterBook === "object"
    ? (companionProfileRaw.characterBook as Record<string, unknown>)
    : null;
  const companionLorebookEntries = companionCharacterBookRaw && Array.isArray(companionCharacterBookRaw.entries)
    ? (companionCharacterBookRaw.entries as Array<Record<string, unknown>>)
        .filter(e => e.enabled !== false && typeof e.content === "string" && e.content)
        .sort((a, b) => Number(a.insertion_order ?? 0) - Number(b.insertion_order ?? 0))
    : [];

  const recentText = [
    ...contextMessages.slice(-6).map(m => m.content),
    message,
  ].filter(Boolean).join(" ");

  const gameState = conversation.gameState as GameState | null;

  // Diagnostic — log memory fields so Railway logs can reveal corrupted DB state
  console.log("[chat/memory]", JSON.stringify({
    conversationId: conversation.id,
    companionId: companion.id,
    contextMsgCount: contextMessages.length,
    retrievedMemoryCount: retrievedMemories.length,
    summaryLen: conversation.summary?.length ?? 0,
    memorySummaryLen: conversation.memorySummary?.length ?? 0,
    emotionalMemoryLen: conversation.emotionalMemory?.length ?? 0,
    emotionalProfileLen: conversation.emotionalProfile?.length ?? 0,
    summarySnippet: conversation.summary?.slice(0, 120) ?? null,
    memorySummarySnippet: conversation.memorySummary?.slice(0, 120) ?? null,
    retrievedSnippets: retrievedMemories.map(m => m.slice(0, 80)),
  }));

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
      kinkLevel: conversation.kinkLevel,
    },
    userFacts,
    retrievedMemories,
    userEmotion: delta?.emotion ?? "neutral",
    companionMood: conversation.companionMood as 0 | 1 | 2 | 3,
    relationshipStage,
    ooc: ooc || undefined,
    lorebookEntries: companionLorebookEntries,
    recentText,
    userLoreText: userLoreInjection.text || undefined,
    gameState: gameState || undefined,
  });

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  async function sse(event: object) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  }

  const loopDetected = detectContextLoop(contextMessages);
  const modelMessages = loopDetected ? breakContextLoop(contextMessages) : contextMessages;

  const recentOpeners = contextMessages
    .filter((m) => m.role === "assistant")
    .slice(-4)
    .map((m) => m.content.trim().split(/[\s,.*\n]/)[0])
    .filter(Boolean);

  if (loopDetected) {
    console.log("[chat/loop] repetition loop detected — compressing context and injecting break instruction", {
      conversationId: conversation.id,
      recentOpeners,
    });
  }

  const loopBreakInstruction = loopDetected
    ? `\n\nCRITICAL — REPETITION LOOP DETECTED: Your recent replies have been nearly identical. You MUST write something completely different right now. Change the subject, emotional angle, tone, and structure entirely. Do NOT echo or continue anything from your recent replies. Start fresh.`
    : "";

  const antiRepeatSystemPrompt = `${systemPrompt}

VARIETY RULES — apply every reply:
- Do NOT open with any of these words/phrases used recently: [${recentOpeners.join(", ") || "none"}]
- Do NOT repeat the same pet names, emotional phrases, or sentence structure as prior replies.
- Each reply must introduce something new: a fresh action, sensory detail, unexpected question, or emotional shift.
- Vary reply length — short replies, longer replies, mixed — never the same length twice in a row.${loopBreakInstruction}
`;

  (async () => {
    try {
      const textStream = companionStream(
        antiRepeatSystemPrompt,
        modelMessages.map((m) => ({
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

      storeConversationMemory({
        supabaseUserId: user.supabaseUserId,
        conversationId: conversation.id,
        companionId: companion.id,
        content: reply,
        role: "assistant",
        messageId: assistantMsg.id,
      }).catch(() => {});

      const profile =
        companion.profile && typeof companion.profile === "object"
          ? (companion.profile as Record<string, unknown>)
          : {};
      const sliders =
        profile.sliders && typeof profile.sliders === "object"
          ? (profile.sliders as Record<string, unknown>)
          : {};

      const progressionMultiplier = relationshipBoostMultiplier(hasRelationshipBoost);
      const progressionDelta = delta
        ? {
            familiarity: Math.max(0, Math.round(delta.familiarity * progressionMultiplier)),
            trust: Math.max(0, Math.round(delta.trust * progressionMultiplier)),
            intimacy: Math.max(0, Math.round(delta.intimacy * progressionMultiplier)),
            kink: delta.kink,
          }
        : null;

      const newFamiliarity = progressionDelta
        ? Math.min(conversation.familiarity + progressionDelta.familiarity, 100)
        : conversation.familiarity;
      const newTrust = progressionDelta
        ? Math.min(conversation.trust + progressionDelta.trust, 100)
        : conversation.trust;
      const newIntimacy = progressionDelta
        ? Math.min(conversation.intimacy + progressionDelta.intimacy, 100)
        : conversation.intimacy;
      const kinkDelta = (delta && companion.contentRating === ContentRating.ADULT) ? delta.kink : 0;
      const newKinkLevel = Math.min(conversation.kinkLevel + kinkDelta, 100);

      const moodTier = computeMoodTier({
        intimacy: newIntimacy,
        emotion: delta?.emotion ?? "neutral",
        flirtiness: Number(sliders.flirtiness ?? 35),
        warmth: Number(sliders.warmth ?? 60),
      });

      const levelingUp = progressionDelta && newFamiliarity >= 100 && newTrust >= 100 && newIntimacy >= 100;
      const currentLevel = conversation.relationshipLevel ?? 1;
      const levelUpCoins = levelingUp ? 25 * currentLevel : 0;

      const updatedConversation = await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          familiarity: levelingUp ? 0 : newFamiliarity,
          trust: levelingUp ? 0 : newTrust,
          intimacy: levelingUp ? 0 : newIntimacy,
          kinkLevel: newKinkLevel,
          companionMood: levelingUp ? 0 : moodTier,
          lastActiveAt: new Date(),
          ...(levelingUp ? { relationshipLevel: currentLevel + 1 } : {}),
        },
        select: { id: true, familiarity: true, trust: true, intimacy: true, kinkLevel: true, summary: true, relationshipLevel: true },
      });

      if (delta) {
        prisma.relationshipProgressEvent
          .create({
            data: {
              conversationId: conversation.id,
              userId: user.id,
              companionId: companion.id,
              eventType: levelingUp ? "LEVEL_UP" : "MESSAGE_PROGRESS",
              oldLevel: currentLevel,
              newLevel: levelingUp ? currentLevel + 1 : currentLevel,
              familiarity: updatedConversation.familiarity,
              trust: updatedConversation.trust,
              intimacy: updatedConversation.intimacy,
              kinkLevel: updatedConversation.kinkLevel,
              metadata: {
                moodTier,
                emotion: delta.emotion,
                progressionMultiplier,
              },
            },
          })
          .catch(() => {});
      }

      if (levelingUp && levelUpCoins > 0) {
        prisma.$transaction([
          prisma.user.update({
            where: { id: user.id },
            data: { coinBalance: { increment: levelUpCoins } },
          }),
          prisma.coinTransaction.create({
            data: {
              userId: user.id,
              amount: levelUpCoins,
              kind: "relationship_levelup",
              description: `Level ${currentLevel} bond completed with ${companion.name}`,
            },
          }),
        ]).catch(() => {});
      }

      const dailyLimit = DAILY_MESSAGE_LIMITS[user.plan];
      let dailyUsed: number | null = null;
      if (dailyLimit !== null && userMsg) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        dailyUsed = await prisma.chatMessage.count({
          where: { role: "user", createdAt: { gte: startOfDay }, conversation: { userId: user.id } },
        });
      }

      await sse({
        type: "done",
        reply,
        moodTier,
        userMsgId: userMsg?.id ?? null,
        assistantMsgId: assistantMsg.id,
        dailyUsed,
        dailyLimit,
        levelUp: levelingUp ? { level: currentLevel, nextLevel: currentLevel + 1, coinsEarned: levelUpCoins } : null,
        memory: {
          id: updatedConversation.id,
          familiarity: updatedConversation.familiarity,
          trust: updatedConversation.trust,
          intimacy: updatedConversation.intimacy,
          kinkLevel: updatedConversation.kinkLevel,
          relationshipLevel: updatedConversation.relationshipLevel,
          summary: updatedConversation.summary,
        },
      });

      if (delta) {
        const allMessages = [
          ...contextMessages,
          { role: "user", content: message },
          { role: "assistant", content: reply },
        ].filter((m) => m.content);

        Promise.all([
          maybeRefreshConversationSummary({ conversationId: conversation.id, currentSummary: conversation.summary }),
          maybeExtractUserMemory({ conversationId: conversation.id, currentMemory: conversation.memorySummary }),
          maybeExtractEmotionalMemory({ conversationId: conversation.id, currentMemory: conversation.emotionalMemory }),
          maybeExtractEmotionalProfile({ conversationId: conversation.id, currentProfile: conversation.emotionalProfile }),
          extractGameState({
            conversationId: conversation.id,
            previousState: gameState,
            recentMessages: allMessages,
          }),
        ]).catch(() => {});
      }
    } catch (error) {
      const e = error as { status?: number; message?: string };
      console.error("[chat/route] generation failed", JSON.stringify({
        status: e?.status,
        message: e?.message,
        raw: String(error),
      }));
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
