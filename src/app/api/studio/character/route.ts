// file: src/app/api/studio/character/route.ts
import { NextResponse } from "next/server";
import { generateCompanionFieldsFromDraft } from "@/lib/companion-generator";

export const runtime = "nodejs";

type IncomingDraft = {
  name?: unknown;
  tagline?: unknown;
  role?: unknown;
  personality?: unknown;
  appearance?: unknown;
  backstory?: unknown;
  speakingStyle?: unknown;
  goals?: unknown;
  scenario?: unknown;
  firstMessage?: unknown;
  exampleDialogue?: unknown;
  systemPrompt?: unknown;
  description?: unknown;
  tags?: unknown;
  archetype?: unknown;
  gender?: unknown;
  traits?: unknown;
  contentRating?: unknown;
  warmth?: unknown;
  humor?: unknown;
  flirtiness?: unknown;
  dominance?: unknown;
  kink?: unknown;
};

type StudioMode = "generate" | "rewrite" | "expand";

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function readOptionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function sentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return `${trimmed.slice(0, 1).toUpperCase()}${trimmed.slice(1)}`;
}

function gerundPhrase(value: string) {
  return value
    .trim()
    .replace(/^hides?\b/i, "hiding")
    .replace(/^wants?\s+to\b/i, "trying to")
    .replace(/^protects?\b/i, "protecting");
}

function expandBackstorySeed(seed: string, fallback: string) {
  const fragments = seed
    .split(/[\n.]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (fragments.length === 0) return fallback;

  const [origin, wound, mask, desire] = fragments;
  const lines = [
    origin ? `${sentenceCase(origin)}.` : "",
    wound ? `That past still follows them: ${wound}.` : "",
    mask ? `They usually mask it by ${gerundPhrase(mask)}.` : "",
    desire
      ? `What drives them now is simple but difficult: ${gerundPhrase(desire)}.`
      : "",
  ].filter(Boolean);

  return lines.join(" ");
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  if (!body || !["generate", "rewrite", "expand"].includes(body.mode)) {
    return NextResponse.json(
      { ok: false, error: "Invalid request." },
      { status: 400 },
    );
  }

  const mode = body.mode as StudioMode;
  const draft = (body.draft ?? {}) as IncomingDraft;
  const generated = generateCompanionFieldsFromDraft({
    name: readString(draft.name),
    tagline: readString(draft.tagline),
    role: readString(draft.role),
    personality: readString(draft.personality),
    appearance: readString(draft.appearance),
    backstory: readString(draft.backstory),
    speakingStyle: readString(draft.speakingStyle),
    goals: readString(draft.goals),
    scenario: readString(draft.scenario),
    firstMessage: readString(draft.firstMessage),
    exampleDialogue: readString(draft.exampleDialogue),
    systemPrompt: readString(draft.systemPrompt),
    description: readString(draft.description),
    tags: readStringArray(draft.tags),
    archetype: readString(draft.archetype),
    gender: readString(draft.gender),
    traits: readStringArray(draft.traits),
    contentRating: draft.contentRating === "ADULT" ? "ADULT" : "SAFE",
    warmth: readOptionalNumber(draft.warmth),
    humor: readOptionalNumber(draft.humor),
    flirtiness: readOptionalNumber(draft.flirtiness),
    dominance: readOptionalNumber(draft.dominance),
    kink: readOptionalNumber(draft.kink),
  });

  if (mode === "rewrite") {
    return NextResponse.json({
      ok: true,
      text: generated.personality,
    });
  }

  if (mode === "expand") {
    const seed =
      typeof body.fieldValue === "string"
        ? body.fieldValue
        : readString(draft.backstory);
    return NextResponse.json({
      ok: true,
      text: expandBackstorySeed(seed, generated.backstory),
    });
  }

  return NextResponse.json({
    ok: true,
    fields: generated,
  });
}
