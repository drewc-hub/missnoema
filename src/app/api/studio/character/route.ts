import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth";
import { companionGenerate } from "@/lib/ai-client";

export const runtime = "nodejs";

const Schema = z.object({
    mode: z.enum(["generate", "rewrite", "expand"]),
    field: z.string().optional(),
    fieldValue: z.string().optional(),
    seed: z.string().optional(),
    draft: z.object({
        name: z.string(),
        tagline: z.string(),
        role: z.string(),
        personality: z.string(),
        appearance: z.string(),
        backstory: z.string(),
        speakingStyle: z.string(),
        goals: z.string(),
        scenario: z.string(),
        firstMessage: z.string(),
        exampleDialogue: z.string(),
        systemPrompt: z.string(),
    }),
});

const FIELD_LABELS: Record<string, string> = {
    tagline: "Tagline / Description",
    role: "Role",
    personality: "Personality",
    appearance: "Appearance",
    backstory: "Backstory",
    speakingStyle: "Speaking Style",
    goals: "Goals",
    scenario: "Scenario",
    firstMessage: "First Message",
    exampleDialogue: "Example Dialogue",
    systemPrompt: "System Prompt",
};

export async function POST(req: Request) {
    const user = await getAuthedUser();
    if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

    const body = await req.json().catch(() => null);
    const parsed = Schema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Invalid input." }, { status: 400 });

    const { mode, field, fieldValue, seed, draft } = parsed.data;

    let prompt = "";

    if (mode === "generate") {
        const context = seed
            ? `Seed idea: "${seed}"`
            : `Character name: "${draft.name}"${draft.tagline ? `, concept: "${draft.tagline}"` : ""}`;

        prompt = `You are a creative character writer for an AI companion platform. Generate a complete character profile for the following:

${context}

Return a JSON object with these exact keys:
{
  "tagline": "one-sentence description (max 120 chars)",
  "role": "their role or occupation (1-2 sentences)",
  "personality": "detailed personality traits (3-5 sentences)",
  "appearance": "physical description (2-4 sentences)",
  "backstory": "compelling backstory (3-6 sentences)",
  "speakingStyle": "how they speak and communicate (2-3 sentences)",
  "goals": "their motivations and goals (2-4 sentences)",
  "scenario": "the default roleplay scenario (2-4 sentences)",
  "firstMessage": "their opening message to the user (1-3 sentences, in character)",
  "exampleDialogue": "example dialogue showing their voice (2-3 exchange pairs, formatted as User: ... / ${draft.name || "Character"}: ...)"
}

Return only valid JSON, no markdown.`;
    } else if (mode === "rewrite" && field) {
        const label = FIELD_LABELS[field] ?? field;
        prompt = `You are a creative character writer. Rewrite the following "${label}" field for a character named "${draft.name || "this character"}".

Current text:
${fieldValue || "(empty)"}

Character context:
- Personality: ${draft.personality || "not set"}
- Role: ${draft.role || "not set"}

Write a fresh, improved version of the "${label}" field. Return only the rewritten text, no labels or explanation.`;
    } else if (mode === "expand" && field) {
        const label = FIELD_LABELS[field] ?? field;
        prompt = `You are a creative character writer. Expand the following "${label}" field for a character named "${draft.name || "this character"}". Add more depth and detail.

Current text:
${fieldValue || "(empty)"}

Character context:
- Personality: ${draft.personality || "not set"}
- Role: ${draft.role || "not set"}

Return only the expanded text, no labels or explanation.`;
    } else {
        return NextResponse.json({ error: "Invalid mode or missing field." }, { status: 400 });
    }

    const text = await companionGenerate("You are a helpful creative writing assistant.", [
        { role: "user", content: prompt },
    ]);

    if (mode === "generate") {
        try {
            const json = JSON.parse(text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, ""));
            return NextResponse.json({ ok: true, mode, fields: json });
        } catch {
            return NextResponse.json({ error: "Failed to parse AI response." }, { status: 500 });
        }
    }

    return NextResponse.json({ ok: true, mode, field, text: text.trim() });
}
