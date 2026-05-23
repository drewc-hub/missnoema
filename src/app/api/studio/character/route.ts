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

function readString(value: unknown): string {
    return typeof value === "string" ? value : "";
}

function readStringArray(value: unknown): string[] {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string")
        : [];
}

function readOptionalNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function POST(req: Request) {
    const body = await req.json().catch(() => null);

    if (!body || body.mode !== "generate") {
        return NextResponse.json(
            { ok: false, error: "Invalid request." },
            { status: 400 }
        );
    }

    const draft = (body.draft ?? {}) as IncomingDraft;

    const fields = generateCompanionFieldsFromDraft({
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

    return NextResponse.json({
        ok: true,
        fields,
    });
}
