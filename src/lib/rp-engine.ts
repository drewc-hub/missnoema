import { prisma } from "@/lib/prisma";
import { chatCompletion } from "@/lib/together";
import { companionStream } from "@/lib/ai-client";

// ── Lorebook injection ──────────────────────────────────────

export interface LoreInjection {
  text: string;
  entryCount: number;
}

/**
 * Load all enabled lorebooks for a user, scan recent text for keyword matches,
 * and return injected lore content ready to append to the system prompt.
 */
export async function buildLoreInjection(
  userId: string,
  recentText: string,
): Promise<LoreInjection> {
  const lorebooks = await (prisma as any).lorebook.findMany({
    where: { userId, enabled: true },
    include: {
      entries: { where: { enabled: true }, orderBy: { priority: "desc" } },
    },
  });

  const lower = recentText.toLowerCase();
  const matched: string[] = [];
  let totalChars = 0;
  const CHAR_BUDGET = 2000;

  for (const book of lorebooks) {
    for (const entry of book.entries) {
      if (totalChars >= CHAR_BUDGET) break;

      const triggered =
        entry.constant ||
        (entry.keys as string[]).some((k: string) => k && lower.includes(k.toLowerCase()));

      if (!triggered) continue;

      const chunk = `[${book.name}] ${entry.content}`;
      if (totalChars + chunk.length > CHAR_BUDGET) break;
      matched.push(chunk);
      totalChars += chunk.length + 1;
    }
    if (totalChars >= CHAR_BUDGET) break;
  }

  return {
    text: matched.join("\n\n"),
    entryCount: matched.length,
  };
}

// ── Game state extraction ────────────────────────────────────

export interface GameState {
  location?: string;
  time?: string;
  weather?: string;
  presentCharacters?: string[];
  activeQuests?: string[];
  recentEvents?: string[];
  inventory?: string[];
  [key: string]: unknown;
}

/**
 * Run a quick LLM call after the main response to extract structured game state.
 * Merges with existing state. Fire-and-forget — should not block the main response.
 */
export async function extractGameState(args: {
  conversationId: string;
  previousState: GameState | null;
  recentMessages: Array<{ role: string; content: string }>;
}): Promise<void> {
  const { conversationId, previousState, recentMessages } = args;

  const last6 = recentMessages.slice(-6);
  if (last6.length === 0) return;

  const excerpt = last6
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 300)}`)
    .join("\n");

  const prevJson = previousState ? JSON.stringify(previousState) : "{}";

  try {
    const response = await chatCompletion({
      messages: [
        {
          role: "system",
          content:
            "You are a game state extractor. Given a roleplay excerpt, extract structured state changes as JSON. " +
            "Return ONLY a JSON object with any of these fields that changed or were established: " +
            "location (string), time (string), weather (string), presentCharacters (string[]), " +
            "activeQuests (string[]), recentEvents (string[]), inventory (string[]). " +
            "Merge with the existing state. Omit fields that didn't change. Return {} if nothing changed.",
        },
        {
          role: "user",
          content: `Existing state: ${prevJson}\n\nRecent exchange:\n${excerpt}`,
        },
      ],
      max_tokens: 256,
    });

    const raw = response.choices[0]?.message?.content?.trim() ?? "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const extracted = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const merged: GameState = { ...previousState };

    for (const [key, value] of Object.entries(extracted)) {
      if (value === undefined || value === null) continue;
      if (Array.isArray(value) && (value as unknown[]).length === 0) continue;
      merged[key] = value;
    }

    await (prisma as any).conversation.update({
      where: { id: conversationId },
      data: { gameState: merged },
    });
  } catch {
    // Non-critical — game state extraction failure doesn't affect chat
  }
}

// ── Autonomous post-message agent ────────────────────────────

export interface AgentNote {
  type: "relationship" | "lore" | "plot" | "memo";
  content: string;
}

/**
 * Optional post-message autonomous agent that analyzes the exchange and returns
 * notable observations: lore discovered, relationship shifts, plot hooks.
 * Fire-and-forget pattern.
 */
export async function runAutonomousAgent(args: {
  companionName: string;
  recentMessages: Array<{ role: string; content: string }>;
  currentGameState: GameState | null;
}): Promise<AgentNote[]> {
  const { companionName, recentMessages, currentGameState } = args;

  const last4 = recentMessages.slice(-4);
  if (last4.length < 2) return [];

  const excerpt = last4
    .map((m) => `${m.role.toUpperCase()}: ${m.content.slice(0, 200)}`)
    .join("\n");

  const stateStr = currentGameState
    ? `\nCurrent state: ${JSON.stringify(currentGameState)}`
    : "";

  try {
    const systemPrompt = `You are an autonomous story analyst watching a roleplay between a user and ${companionName}.
After each exchange, briefly note anything significant: lore revealed, relationship shifts, plot hooks, or memorable moments.
Respond with ONLY a JSON array: [{"type": "relationship"|"lore"|"plot"|"memo", "content": "short note"}].
Only include truly notable things. Return [] if nothing significant happened. Max 3 notes.`;

    let fullText = "";
    const stream = companionStream(systemPrompt, [
      {
        role: "user",
        content: `Exchange:${stateStr}\n\n${excerpt}\n\nAnalyze.`,
      },
    ]);

    for await (const chunk of stream) {
      fullText += chunk;
    }

    const jsonMatch = fullText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const notes = JSON.parse(jsonMatch[0]) as unknown[];
    return notes
      .filter(
        (n): n is AgentNote =>
          typeof n === "object" &&
          n !== null &&
          typeof (n as AgentNote).type === "string" &&
          typeof (n as AgentNote).content === "string",
      )
      .slice(0, 3);
  } catch {
    return [];
  }
}
