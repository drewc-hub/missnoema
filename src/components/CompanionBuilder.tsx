// file: src/components/CompanionBuilder.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
    Card,
    CardBody,
    CardHeader,
    Input,
    Textarea,
    Button,
    Badge,
} from "@/components/ui";

type ContentRating = "SAFE" | "ADULT";
type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";

type CompanionProfile = {
    // SillyTavern V2 core
    tagline?: string;
    role?: string;
    appearance?: string;
    speakingStyle?: string;
    goals?: string;
    greeting?: string;
    exampleDialogue?: string;
    postHistoryInstructions?: string;
    creatorNotes?: string;
    memory?: string;
    // existing
    scene?: string;
    background?: string;
    personality?: string;
    wardrobe?: string;
    traits?: string[];
    voice?: string;
    sexuality?: string;
    voiceMeta?: { accent?: string; voiceId?: string };
    behaviorMeta?: {
        voiceStyle?: string;
        speechPattern?: string;
        emojiUsage?: string;
        attachmentStyle?: string;
        temperament?: string;
        traumaProfile?: string;
        humorStyle?: string;
        jealousyLevel?: number;
        dominanceLevel?: number;
        affectionLevel?: number;
        empathyLevel?: number;
    };
    nsfwPreferenceTags?: string[];
    aiPersonalityPrompt?: string;
    stats?: Record<string, number>;
    avatarImageUrl?: string;
    lore?: string;
    orientation?: string;
    bucket?: string;
    promptProfile?: string;
    sliders?: {
        warmth?: number;
        humor?: number;
        flirtiness?: number;
        dominance?: number;
        kink?: number;
    };
    boundaries?: string[];
};

const VOICE_PRESETS = [
    { value: "", label: "Default (gender-based)" },
    { value: "soft-young", label: "Soft & Young" },
    { value: "warm-sultry", label: "Warm & Sultry" },
    { value: "deep-breathy", label: "Deep & Breathy" },
    { value: "playful-energetic", label: "Playful & Energetic" },
    { value: "mature-refined", label: "Mature & Refined" },
    { value: "older-distinguished", label: "Older & Distinguished" },
    { value: "dark-mysterious", label: "Dark & Mysterious" },
] as const;

type CompanionShape = {
    id?: string;
    slug?: string;
    name: string;
    description: string;
    tags: string[];
    gender?: string | null;
    archetype?: string | null;
    visibility?: Visibility;
    contentRating: ContentRating;
    profile: CompanionProfile | null;
};

type CompanionBuilderProps = {
    mode: "create" | "edit";
    userEmail?: string | null;
    allowAdult: boolean;
    companion: CompanionShape;
    onGenerated?: () => void;
    fullPageMode?: boolean;
    onToggleFullPage?: () => void;
};

const TRAIT_OPTIONS = [
    "witty", "playful", "caring", "gentle", "shy", "curious", "adventurous",
    "sarcastic", "intellectual", "mysterious", "confident", "loyal", "protective",
    "calm", "energetic", "creative", "empathetic", "independent", "stubborn",
    "honest", "charming", "mischievous", "dreamy", "grounded", "intense",
    "patient", "passionate", "whimsical", "stoic", "warm", "nurturing",
    "rebellious", "poetic", "pragmatic", "flirtatious",
    "dominant", "submissive", "teasing", "bold", "assertive", "sensual",
    "seductive", "reserved", "earnest", "dry", "dark", "light-hearted",
    "introspective", "outgoing", "magnetic", "commanding", "tender",
] as const;

const ARCHETYPE_CHIPS = [
    "Demon", "Devil girl", "Succubus", "Incubus",
    "Elf", "Dark elf", "Wood elf", "High elf",
    "Goblin", "Hobgoblin", "Orc", "Half-orc",
    "Alien", "Android", "Cyborg", "AI entity",
    "Vampire", "Werewolf", "Witch", "Warlock",
    "Fae", "Fairy", "Angel", "Fallen angel",
    "Dragon", "Naga", "Mermaid", "Ghost",
    "Idol", "Athlete", "Scholar", "Rebel",
    "Royalty", "Knight", "Rogue", "Bard",
    "Barista", "Chef", "Artist", "Nurse",
    "Trans woman", "Trans man", "Non-binary",
    "Gay / bi man", "Lesbian / bi woman", "Pansexual",
] as const;

const SCENE_PRESETS = [
    "Coffee shop",
    "Beach at sunset",
    "Cozy bedroom",
    "Luxury hotel",
    "City rooftop",
    "Rainy night street",
    "Fantasy tavern",
    "Enchanted forest",
    "Space station",
    "Private studio",
] as const;

function slugify(value: string) {
    return value
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 70);
}

function profileStr(profile: CompanionProfile | null, key: keyof CompanionProfile): string {
    if (!profile) return "";
    const v = profile[key];
    return typeof v === "string" ? v : "";
}

function statsToInput(stats: Record<string, number> | undefined) {
    if (!stats) return "";
    return Object.entries(stats)
        .map(([k, v]) => `${k}:${Math.round(v)}`)
        .join(", ");
}

function parseStatsInput(input: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const part of input.split(",")) {
        const [rawKey, rawValue] = part.split(":").map((x) => x?.trim() ?? "");
        if (!rawKey || !rawValue) continue;
        const value = Number(rawValue);
        if (!Number.isFinite(value)) continue;
        out[rawKey] = Math.max(0, Math.min(100, Math.round(value)));
    }
    return out;
}

function RangeRow({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint: string;
    value: number;
    onChange: (next: number) => void;
}) {
    return (
        <label className="space-y-1">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-zinc-300">{label}</span>
                <span className="text-xs font-mono text-fuchsia-400">{value}</span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-fuchsia-500"
            />
            <div className="flex justify-between text-[11px] text-zinc-500">
                <span>{hint.split("→")[0]?.trim() ?? "0"}</span>
                <span>{hint.split("→")[1]?.trim() ?? "100"}</span>
            </div>
        </label>
    );
}

export function CompanionBuilder({
    mode,
    userEmail,
    allowAdult,
    companion,
    onGenerated,
    fullPageMode,
    onToggleFullPage,
}: CompanionBuilderProps) {
    const profile = companion.profile ?? ({} as CompanionProfile);
    const sliders = profile.sliders ?? {};
    const behaviorMeta = profile.behaviorMeta ?? {};

    // Basic info
    const [name, setName] = useState(companion.name ?? "");
    const [slug, setSlug] = useState(companion.slug ?? "");
    const [description, setDescription] = useState(companion.description ?? "");
    const [tags, setTags] = useState((companion.tags ?? []).join(", "));
    const [archetype, setArchetype] = useState(companion.archetype ?? "");
    const [gender, setGender] = useState(companion.gender ?? "");
    const [visibility, setVisibility] = useState<Visibility>(companion.visibility ?? "UNLISTED");
    const [contentRating, setContentRating] = useState<ContentRating>(companion.contentRating ?? "SAFE");

    // SillyTavern V2 core fields
    const [tagline, setTagline] = useState(
        profileStr(profile, "tagline") || companion.description || ""
    );
    const [role, setRole] = useState(
        profileStr(profile, "role") || companion.archetype || ""
    );
    const [personality, setPersonality] = useState(profileStr(profile, "personality"));
    const [appearance, setAppearance] = useState(
        profileStr(profile, "appearance") || profileStr(profile, "wardrobe")
    );
    const [background, setBackground] = useState(profileStr(profile, "background"));
    const [speakingStyle, setSpeakingStyle] = useState(
        profileStr(profile, "speakingStyle") || behaviorMeta.speechPattern || ""
    );
    const [goals, setGoals] = useState(profileStr(profile, "goals"));
    const [firstMessage, setFirstMessage] = useState(
        profileStr(profile, "greeting")
    );
    const [exampleDialogue, setExampleDialogue] = useState(
        profileStr(profile, "exampleDialogue")
    );
    const [postHistoryInstructions, setPostHistoryInstructions] = useState(
        profileStr(profile, "postHistoryInstructions")
    );
    const [creatorNotes, setCreatorNotes] = useState(
        profileStr(profile, "creatorNotes")
    );

    // Personality sliders (behavior meta)
    const [jealousyLevel, setJealousyLevel] = useState(Number(behaviorMeta.jealousyLevel ?? 20));
    const [dominanceLevel, setDominanceLevel] = useState(Number(behaviorMeta.dominanceLevel ?? sliders.dominance ?? 30));
    const [affectionLevel, setAffectionLevel] = useState(Number(behaviorMeta.affectionLevel ?? sliders.warmth ?? 60));
    const [empathyLevel, setEmpathyLevel] = useState(Number(behaviorMeta.empathyLevel ?? 50));

    // Profile sliders
    const [warmth, setWarmth] = useState(Number(sliders.warmth ?? 60));
    const [humor, setHumor] = useState(Number(sliders.humor ?? 55));
    const [flirtiness, setFlirtiness] = useState(Number(sliders.flirtiness ?? (allowAdult ? 35 : 10)));
    const [dominance, setDominance] = useState(Number(sliders.dominance ?? 30));
    const [kink, setKink] = useState(Number(sliders.kink ?? 0));

    // Behavior meta text fields
    const [voiceStyle, setVoiceStyle] = useState(behaviorMeta.voiceStyle ?? "");
    const [speechPattern, setSpeechPattern] = useState(behaviorMeta.speechPattern ?? "");
    const [emojiUsage, setEmojiUsage] = useState(behaviorMeta.emojiUsage ?? "");
    const [attachmentStyle, setAttachmentStyle] = useState(behaviorMeta.attachmentStyle ?? "");
    const [temperament, setTemperament] = useState(behaviorMeta.temperament ?? "");
    const [traumaProfile, setTraumaProfile] = useState(behaviorMeta.traumaProfile ?? "");
    const [humorStyle, setHumorStyle] = useState(behaviorMeta.humorStyle ?? "");

    // Voice / identity
    const [sexuality, setSexuality] = useState(profile.sexuality ?? "");
    const [voice, setVoice] = useState(profile.voice ?? "");
    const [voiceAccent, setVoiceAccent] = useState(profile.voiceMeta?.accent ?? "");

    // Advanced profile fields
    const [avatarImageUrl, setAvatarImageUrl] = useState(profile.avatarImageUrl ?? "");
    const [lore, setLore] = useState(profileStr(profile, "lore"));
    const [orientation, setOrientation] = useState(profile.orientation ?? "");
    const [bucket, setBucket] = useState(profile.bucket ?? "");
    const [promptProfile, setPromptProfile] = useState(profile.promptProfile ?? "");
    const [aiPersonalityPrompt, setAiPersonalityPrompt] = useState(profile.aiPersonalityPrompt ?? "");
    const [nsfwPreferenceTags, setNsfwPreferenceTags] = useState(
        (profile.nsfwPreferenceTags ?? []).join(", ")
    );
    const [statsInput, setStatsInput] = useState(statsToInput(profile.stats));
    const [boundaries, setBoundaries] = useState(
        Array.isArray(profile.boundaries) ? profile.boundaries.join(", ") : ""
    );
    const [traitList, setTraitList] = useState<string[]>(
        Array.isArray(profile.traits) ? profile.traits.slice(0, 10) : []
    );
    const [wardrobe, setWardrobe] = useState(profileStr(profile, "wardrobe"));

    const [scenePreset, setScenePreset] = useState(
        SCENE_PRESETS.includes((profile.scene ?? "") as (typeof SCENE_PRESETS)[number])
            ? (profile.scene as (typeof SCENE_PRESETS)[number])
            : ""
    );
    const [sceneCustom, setSceneCustom] = useState(
        profile.scene && !SCENE_PRESETS.includes(profile.scene as (typeof SCENE_PRESETS)[number])
            ? profile.scene
            : ""
    );

    // UI state
    const [submitting, setSubmitting] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [generateStatus, setGenerateStatus] = useState<string | null>(null);
    const [cardImporting, setCardImporting] = useState(false);
    const [cardImportMessage, setCardImportMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const computedSlug = useMemo(() => {
        if (mode === "edit") return slug;
        return slugify(name);
    }, [mode, name, slug]);

    function buildPayload(overrides?: {
        tagline?: string;
        role?: string;
        personality?: string;
        appearance?: string;
        background?: string;
        speakingStyle?: string;
        goals?: string;
        sceneCustom?: string;
        firstMessage?: string;
        exampleDialogue?: string;
    }) {
        const o = overrides ?? {};
        const finalTagline = o.tagline ?? tagline;
        const finalRole = o.role ?? role;
        const finalPersonality = o.personality ?? personality;
        const finalAppearance = o.appearance ?? appearance;
        const finalBackground = o.background ?? background;
        const finalSpeakingStyle = o.speakingStyle ?? speakingStyle;
        const finalGoals = o.goals ?? goals;
        const finalSceneCustom = o.sceneCustom ?? sceneCustom;
        const finalFirstMessage = o.firstMessage ?? firstMessage;
        const finalExampleDialogue = o.exampleDialogue ?? exampleDialogue;

        return {
            name: name.trim(),
            slug: mode === "create" ? computedSlug || slugify(name) : companion.slug,
            description: description.trim() || finalTagline.trim() || companion.description,
            tags: tags.split(",").map((x) => x.trim()).filter(Boolean),
            gender: gender.trim() || null,
            archetype: archetype.trim() || null,
            visibility,
            contentRating,
            profile: {
                tagline: finalTagline.trim(),
                role: finalRole.trim(),
                appearance: finalAppearance.trim(),
                speakingStyle: finalSpeakingStyle.trim(),
                goals: finalGoals.trim(),
                greeting: finalFirstMessage.trim(),
                exampleDialogue: finalExampleDialogue.trim(),
                postHistoryInstructions: postHistoryInstructions.trim(),
                creatorNotes: creatorNotes.trim(),
                scene: finalSceneCustom.trim() || scenePreset || "",
                background: finalBackground.trim(),
                personality: finalPersonality.trim(),
                wardrobe: wardrobe.trim(),
                traits: traitList,
                voice: voice || null,
                sexuality: sexuality.trim() || null,
                voiceMeta: {
                    accent: voiceAccent.trim(),
                    voiceId: voice || "",
                },
                behaviorMeta: {
                    voiceStyle: voiceStyle.trim(),
                    speechPattern: speechPattern.trim() || finalSpeakingStyle.trim(),
                    emojiUsage: emojiUsage.trim(),
                    attachmentStyle: attachmentStyle.trim(),
                    temperament: temperament.trim(),
                    traumaProfile: traumaProfile.trim(),
                    humorStyle: humorStyle.trim(),
                    jealousyLevel,
                    dominanceLevel,
                    affectionLevel,
                    empathyLevel,
                },
                avatarImageUrl: avatarImageUrl.trim(),
                lore: lore.trim(),
                orientation: orientation.trim(),
                bucket: bucket.trim(),
                promptProfile: promptProfile.trim(),
                aiPersonalityPrompt: aiPersonalityPrompt.trim(),
                nsfwPreferenceTags: nsfwPreferenceTags.split(",").map((x) => x.trim()).filter(Boolean),
                stats: parseStatsInput(statsInput),
                sliders: { warmth, humor, flirtiness, dominance, kink },
                boundaries: boundaries.split(",").map((x) => x.trim()).filter(Boolean),
            },
        };
    }

    async function doSave(overrides?: Parameters<typeof buildPayload>[0]): Promise<boolean> {
        if (!allowAdult && contentRating === "ADULT") {
            setError("Age verification is required for 18+ companions.");
            return false;
        }
        const payload = buildPayload(overrides);
        const endpoint =
            mode === "create"
                ? "/api/companions"
                : `/api/companions/${encodeURIComponent(companion.slug ?? "")}`;
        const method = mode === "create" ? "POST" : "PATCH";

        const res = await fetch(endpoint, {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
            setError(json?.error || "Failed to save companion.");
            return false;
        }
        if (mode === "create" && json?.editUrl) {
            window.location.href = json.editUrl;
            return true;
        }
        setSavedMessage("Saved.");
        return true;
    }

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSavedMessage(null);
        try {
            await doSave();
        } finally {
            setSubmitting(false);
        }
    }

    async function handleGenerate() {
        if (!name && !tagline) {
            setError("Enter a name or tagline before generating.");
            return;
        }
        setGenerating(true);
        setGenerateStatus("Generating character...");
        setError(null);
        setSavedMessage(null);
        try {
            const res = await fetch("/api/studio/character", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    mode: "generate",
                    seed: name || tagline,
                    draft: {
                        name: name || "Character",
                        tagline,
                        role,
                        personality,
                        appearance,
                        backstory: background,
                        speakingStyle,
                        goals,
                        scenario: sceneCustom || scenePreset,
                        firstMessage,
                        exampleDialogue,
                        systemPrompt: aiPersonalityPrompt,
                    },
                }),
            });
            const json = await res.json().catch(() => null);
            if (!json?.ok || !json.fields) {
                setGenerateStatus("Generation failed.");
                return;
            }
            const f = json.fields;
            const updates: Parameters<typeof buildPayload>[0] = {};
            if (f.tagline) { setTagline(f.tagline); updates.tagline = f.tagline; }
            if (f.role) { setRole(f.role); updates.role = f.role; }
            if (f.personality) { setPersonality(f.personality); updates.personality = f.personality; }
            if (f.appearance) { setAppearance(f.appearance); updates.appearance = f.appearance; }
            if (f.backstory) { setBackground(f.backstory); updates.background = f.backstory; }
            if (f.speakingStyle) { setSpeakingStyle(f.speakingStyle); updates.speakingStyle = f.speakingStyle; }
            if (f.goals) { setGoals(f.goals); updates.goals = f.goals; }
            if (f.scenario) { setSceneCustom(f.scenario); updates.sceneCustom = f.scenario; }
            if (f.firstMessage) { setFirstMessage(f.firstMessage); updates.firstMessage = f.firstMessage; }
            if (f.exampleDialogue) { setExampleDialogue(f.exampleDialogue); updates.exampleDialogue = f.exampleDialogue; }

            if (mode === "edit") {
                setGenerateStatus("Saving...");
                const saved = await doSave(updates);
                if (saved) {
                    setGenerateStatus("Generated and saved! Check the media panel.");
                    onGenerated?.();
                }
            } else {
                setGenerateStatus("Fields filled! Review and click Create.");
            }
        } catch {
            setGenerateStatus("Generation failed.");
        } finally {
            setGenerating(false);
        }
    }

    async function onCharacterCardImport(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setCardImporting(true);
        setCardImportMessage(null);
        setError(null);
        setSavedMessage(null);
        try {
            const raw = await file.text();
            const card = JSON.parse(raw);
            const res = await fetch("/api/companions/import/character-card-v2", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ card, visibility, contentRating }),
            });
            const json = await res.json().catch(() => null);
            if (!res.ok) throw new Error(json?.error || "Failed to import character card.");
            setCardImportMessage("Imported. Opening editor...");
            window.location.href = json?.editUrl || json?.viewUrl || "/companions";
        } catch (err) {
            setError(err instanceof Error ? err.message : "Invalid Character Card V2 JSON.");
        } finally {
            setCardImporting(false);
        }
    }

    return (
        <Card className="border-fuchsia-900/40 bg-black/90 shadow-[0_0_60px_rgba(168,85,247,0.07)]">
            <CardHeader
                title={mode === "create" ? "Companion Builder" : "Edit Companion"}
                subtitle={
                    mode === "create"
                        ? "Create the profile first. After saving, you can generate photos."
                        : "Update the profile, tone, and settings for this companion."
                }
                right={
                    <div className="flex items-center gap-2">
                        {onToggleFullPage && (
                            <button
                                type="button"
                                onClick={onToggleFullPage}
                                className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                                title={fullPageMode ? "Show media panel" : "Expand editor"}
                            >
                                {fullPageMode ? "⬅ Show panels" : "Expand ⬆"}
                            </button>
                        )}
                        <details className="group relative">
                            <summary className="flex cursor-pointer select-none list-none items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white">
                                Profile
                                <svg className="h-3 w-3 flex-none transition-transform group-open:rotate-180" fill="none" viewBox="0 0 10 6" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
                                </svg>
                            </summary>
                            <div className="absolute right-0 top-full z-20 mt-2 flex min-w-[180px] flex-col gap-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3 shadow-xl">
                                {userEmail ? <Badge tone="safe">{userEmail}</Badge> : <Badge>Guest</Badge>}
                                <Badge tone={contentRating === "ADULT" ? "adult" : "safe"}>{contentRating}</Badge>
                            </div>
                        </details>
                    </div>
                }
            />

            <CardBody className="space-y-4">
                {/* Character Card V2 import/export */}
                <div className="rounded-2xl border border-sky-900/40 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4 shadow-[0_0_35px_rgba(0,121,193,0.12)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <div className="text-sm font-semibold text-white">Character Card V2</div>
                            <div className="text-xs text-sky-100/80">
                                Import SillyTavern-style cards or export this companion as portable JSON.
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {mode === "create" ? (
                                <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/15">
                                    {cardImporting ? "Importing..." : "Import JSON"}
                                    <input type="file" accept="application/json,.json" className="sr-only" disabled={cardImporting} onChange={onCharacterCardImport} />
                                </label>
                            ) : companion.slug ? (
                                <a href={`/api/companions/${encodeURIComponent(companion.slug)}/export/character-card-v2`} download>
                                    <Button type="button" variant="secondary">Export JSON</Button>
                                </a>
                            ) : null}
                        </div>
                    </div>
                    {cardImportMessage ? (
                        <div className="mt-3 rounded-xl border border-white/20 bg-white/10 p-2 text-xs text-white">{cardImportMessage}</div>
                    ) : null}
                </div>

                <form onSubmit={onSubmit} className="space-y-6">
                    {/* Basic Info */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
                        <div className="text-sm font-semibold text-zinc-100">Basic Info</div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Name</div>
                                <Input value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder="Nova" required />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Slug</div>
                                <Input value={mode === "create" ? computedSlug : slug} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSlug(e.target.value)} placeholder="nova" disabled={mode === "create"} />
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Tags (comma-separated)</div>
                                <Input value={tags} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)} placeholder="romance, cozy, fantasy" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Archetype</div>
                                <Input value={archetype} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchetype(e.target.value)} placeholder="demon noble, fae trickster, trans idol…" />
                                <details className="group">
                                    <summary className="flex cursor-pointer select-none list-none items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs font-medium transition-colors hover:border-fuchsia-500/50 hover:text-fuchsia-300 text-zinc-400">
                                        <svg className="h-3 w-3 flex-none transition-transform group-open:rotate-180" fill="none" viewBox="0 0 10 6" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
                                        </svg>
                                        Browse archetypes
                                    </summary>
                                    <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {ARCHETYPE_CHIPS.map((chip) => (
                                                <button key={chip} type="button" onClick={() => setArchetype(chip)}
                                                    className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${archetype === chip ? "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-200" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-fuchsia-500/40 hover:text-zinc-200"}`}>
                                                    {chip}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <label className="space-y-1">
                                <div className="text-xs text-zinc-400">Gender identity</div>
                                <select value={gender} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGender(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                                    <option value="">Unspecified</option>
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                    <option value="non-binary">Non-binary</option>
                                    <option value="trans-woman">Transgender woman</option>
                                    <option value="trans-man">Transgender man</option>
                                    <option value="gender-fluid">Gender-fluid</option>
                                </select>
                            </label>
                            <label className="space-y-1">
                                <div className="text-xs text-zinc-400">Sexual orientation</div>
                                <select value={sexuality} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSexuality(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                                    <option value="">Unspecified</option>
                                    <option value="heterosexual">Heterosexual</option>
                                    <option value="gay-lesbian">Gay / Lesbian</option>
                                    <option value="bisexual">Bisexual</option>
                                    <option value="pansexual">Pansexual</option>
                                    <option value="asexual">Asexual</option>
                                </select>
                            </label>
                            <label className="space-y-1">
                                <div className="text-xs text-zinc-400">Voice style</div>
                                <select value={voice} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVoice(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                                    {VOICE_PRESETS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                                </select>
                            </label>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1">
                                <div className="text-xs text-zinc-400">Visibility</div>
                                <select value={visibility} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVisibility(e.target.value as Visibility)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                                    <option value="PUBLIC">PUBLIC</option>
                                    <option value="UNLISTED">UNLISTED</option>
                                    <option value="PRIVATE">PRIVATE</option>
                                </select>
                            </label>
                            <label className="space-y-1">
                                <div className="text-xs text-zinc-400">Content rating</div>
                                <select value={contentRating} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setContentRating(e.target.value as ContentRating)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                                    <option value="SAFE">SAFE</option>
                                    {allowAdult ? <option value="ADULT">ADULT</option> : null}
                                </select>
                                {!allowAdult && (
                                    <div className="text-[11px] text-zinc-500">Age verification required for ADULT.</div>
                                )}
                            </label>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Description (required)</div>
                            <Textarea rows={2} value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} placeholder="Brief description for listings and search results..." required />
                        </div>
                    </div>

                    {/* AI Generate */}
                    <div className="rounded-2xl border border-fuchsia-900/40 bg-fuchsia-950/20 p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-sm font-semibold text-fuchsia-100">AI Generate</div>
                                <div className="text-xs text-zinc-400">
                                    Fill all V2 fields from the name/tagline above.
                                    {mode === "edit" ? " Auto-saves and opens the media panel." : " Review then click Create."}
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                disabled={generating || submitting}
                                className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-500/50 bg-fuchsia-600/20 px-4 py-2 text-sm font-semibold text-fuchsia-200 transition-colors hover:bg-fuchsia-600/30 disabled:opacity-50"
                            >
                                {generating ? (
                                    <>
                                        <span className="h-3 w-3 animate-spin rounded-full border border-fuchsia-400 border-t-transparent" />
                                        Generating...
                                    </>
                                ) : "✦ Generate character"}
                            </button>
                        </div>
                        {generateStatus && (
                            <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${generateStatus.includes("failed") ? "border-red-800/50 bg-red-900/20 text-red-300" : "border-fuchsia-800/40 bg-fuchsia-900/20 text-fuchsia-200"}`}>
                                {generateStatus}
                            </div>
                        )}
                    </div>

                    {/* SillyTavern V2 Core */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
                        <div>
                            <div className="text-sm font-semibold text-zinc-100">Character Card V2 — Core</div>
                            <div className="text-xs text-zinc-500">SillyTavern-compatible fields.</div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Tagline <span className="text-zinc-600">· one-sentence hook</span></div>
                            <Input value={tagline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagline(e.target.value)} placeholder="A sharp-tongued elven noble who hides a centuries-old wound." />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Role <span className="text-zinc-600">· occupation / archetype</span></div>
                            <Input value={role} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRole(e.target.value)} placeholder="Court assassin turned traveling apothecary" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Personality</div>
                            <Textarea rows={5} value={personality} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPersonality(e.target.value)} placeholder="Detailed personality traits, emotional patterns, quirks…" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Appearance</div>
                            <Textarea rows={3} value={appearance} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAppearance(e.target.value)} placeholder="Physical description, style, notable features…" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Backstory</div>
                            <Textarea rows={5} value={background} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBackground(e.target.value)} placeholder="Compelling background and history…" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Speaking style</div>
                            <Textarea rows={2} value={speakingStyle} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSpeakingStyle(e.target.value)} placeholder="How they communicate — cadence, vocabulary, tone…" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Goals & motivations</div>
                            <Textarea rows={3} value={goals} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setGoals(e.target.value)} placeholder="What drives them, what they want from the relationship…" />
                        </div>
                    </div>

                    {/* SillyTavern V2 Dialogue */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
                        <div>
                            <div className="text-sm font-semibold text-zinc-100">Character Card V2 — Dialogue</div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <label className="space-y-1">
                                <div className="text-xs text-zinc-400">Scene preset</div>
                                <select value={scenePreset} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setScenePreset(e.target.value)} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200">
                                    <option value="">(none)</option>
                                    {SCENE_PRESETS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </label>
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Custom scenario</div>
                                <Input value={sceneCustom} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSceneCustom(e.target.value)} placeholder="Custom overrides preset if filled" />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">First message <span className="text-zinc-600">· greeting</span></div>
                            <Textarea rows={4} value={firstMessage} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFirstMessage(e.target.value)} placeholder="Their opening message to the user, written in character…" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Example dialogue <span className="text-zinc-600">· mes_example</span></div>
                            <Textarea rows={5} value={exampleDialogue} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExampleDialogue(e.target.value)} placeholder={"User: Hey, are you okay?\nCharacter: *glances sideways* Define okay."} />
                        </div>
                    </div>

                    {/* SillyTavern V2 System */}
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4 space-y-4">
                        <div>
                            <div className="text-sm font-semibold text-zinc-100">Character Card V2 — System</div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">System prompt <span className="text-zinc-600">· hard rules for AI behavior</span></div>
                            <Textarea rows={5} value={aiPersonalityPrompt} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPersonalityPrompt(e.target.value)} placeholder="You are {{char}}. Always stay in character. Never break the fourth wall…" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Post-history instructions</div>
                            <Textarea rows={3} value={postHistoryInstructions} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPostHistoryInstructions(e.target.value)} placeholder="Instructions appended after chat history…" />
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-zinc-400">Creator notes</div>
                            <Textarea rows={3} value={creatorNotes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCreatorNotes(e.target.value)} placeholder="Notes for users of this character card…" />
                        </div>
                    </div>

                    {/* Personality Sliders */}
                    <div className="rounded-2xl border border-fuchsia-900/40 bg-black/30 p-4">
                        <div className="mb-4">
                            <div className="text-sm font-semibold text-zinc-100">Personality sliders</div>
                            <div className="text-xs text-zinc-500">Shape emotional tone and behavior in conversation.</div>
                        </div>

                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Behavior style</div>
                        <div className="grid gap-4 sm:grid-cols-2 mb-5">
                            <RangeRow label="Jealousy" hint="trusting → possessive" value={jealousyLevel} onChange={setJealousyLevel} />
                            <RangeRow label="Dominance style" hint="yielding → commanding" value={dominanceLevel} onChange={setDominanceLevel} />
                            <RangeRow label="Affection style" hint="reserved → expressive" value={affectionLevel} onChange={setAffectionLevel} />
                            <RangeRow label="Empathy" hint="detached → deeply empathetic" value={empathyLevel} onChange={setEmpathyLevel} />
                        </div>

                        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">Tone & vibe</div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <RangeRow label="Warmth" hint="cold → caring" value={warmth} onChange={setWarmth} />
                            <RangeRow label="Humor" hint="serious → witty" value={humor} onChange={setHumor} />
                            <RangeRow label="Flirtiness" hint="reserved → flirty" value={flirtiness} onChange={setFlirtiness} />
                            <RangeRow label="Assertiveness" hint="soft → dominant" value={dominance} onChange={setDominance} />
                            {contentRating === "ADULT" && (
                                <RangeRow label="Kink intensity" hint="vanilla → BDSM" value={kink} onChange={setKink} />
                            )}
                        </div>
                    </div>

                    {/* Behavior Metadata */}
                    <details className="group rounded-2xl border border-zinc-800 bg-zinc-950/70">
                        <summary className="flex cursor-pointer select-none items-center gap-2 p-4 text-sm font-semibold text-zinc-200 hover:text-white">
                            <svg className="h-4 w-4 flex-none transition-transform group-open:rotate-180" fill="none" viewBox="0 0 10 6" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
                            </svg>
                            Behavior metadata
                            <span className="ml-auto text-xs font-normal text-zinc-500">voice, attachment, humor patterns</span>
                        </summary>
                        <div className="border-t border-zinc-800 p-4 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input value={voiceStyle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVoiceStyle(e.target.value)} placeholder="Voice style: low, warm, aristocratic…" />
                                <Input value={speechPattern} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSpeechPattern(e.target.value)} placeholder="Speech pattern: direct, poetic, teasing…" />
                                <Input value={emojiUsage} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmojiUsage(e.target.value)} placeholder="Emoji usage: none, rare, playful…" />
                                <Input value={attachmentStyle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAttachmentStyle(e.target.value)} placeholder="Attachment style: secure, anxious, avoidant…" />
                                <Input value={temperament} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTemperament(e.target.value)} placeholder="Temperament: calm, fiery, guarded…" />
                                <Input value={humorStyle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setHumorStyle(e.target.value)} placeholder="Humor style: dry wit, banter, absurd…" />
                            </div>
                            <Textarea rows={3} value={traumaProfile} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTraumaProfile(e.target.value)} placeholder="Trauma profile: abandonment fears, betrayal history, guarded trust…" />
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Voice / accent</div>
                                <Input value={voiceAccent} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVoiceAccent(e.target.value)} placeholder="British, Southern US, Tokyo…" />
                            </div>
                        </div>
                    </details>

                    {/* Traits & Wardrobe */}
                    <details className="group rounded-2xl border border-zinc-800 bg-zinc-950/70">
                        <summary className="flex cursor-pointer select-none items-center gap-2 p-4 text-sm font-semibold text-zinc-200 hover:text-white">
                            <svg className="h-4 w-4 flex-none transition-transform group-open:rotate-180" fill="none" viewBox="0 0 10 6" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
                            </svg>
                            Traits & wardrobe
                            <span className="ml-auto text-xs font-normal text-zinc-500">{traitList.length}/10 traits</span>
                        </summary>
                        <div className="border-t border-zinc-800 p-4 space-y-4">
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-2">
                                    <div className="text-xs text-zinc-400">Traits</div>
                                    <div className="text-[11px] text-zinc-500">{traitList.length}/10</div>
                                </div>
                                <select value="" onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    const val = e.target.value;
                                    if (!val || traitList.length >= 10 || traitList.includes(val)) return;
                                    setTraitList((prev) => [...prev, val]);
                                    e.target.value = "";
                                }} disabled={traitList.length >= 10} className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50">
                                    <option value="">{traitList.length >= 10 ? "Limit reached (10)" : "Add a trait…"}</option>
                                    {TRAIT_OPTIONS.filter((t) => !traitList.includes(t)).map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                {traitList.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                        {traitList.map((t) => (
                                            <button key={t} type="button" onClick={() => setTraitList((prev) => prev.filter((x) => x !== t))}
                                                className="inline-flex items-center gap-1 rounded-full border border-fuchsia-900/50 bg-fuchsia-950/30 px-2.5 py-1 text-xs text-fuchsia-200 hover:bg-red-950/40 hover:border-red-900/60 hover:text-red-300 transition">
                                                {t} ✕
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Wardrobe / look</div>
                                <Textarea rows={3} value={wardrobe} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setWardrobe(e.target.value)} placeholder="Outfits, accessories, style…" />
                            </div>
                        </div>
                    </details>

                    {/* Advanced */}
                    <details className="group rounded-2xl border border-zinc-800 bg-zinc-950/70">
                        <summary className="flex cursor-pointer select-none items-center gap-2 p-4 text-sm font-semibold text-zinc-200 hover:text-white">
                            <svg className="h-4 w-4 flex-none transition-transform group-open:rotate-180" fill="none" viewBox="0 0 10 6" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
                            </svg>
                            Advanced
                            <span className="ml-auto text-xs font-normal text-zinc-500">lore, prompt, stats</span>
                        </summary>
                        <div className="border-t border-zinc-800 p-4 space-y-4">
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <div className="text-xs text-zinc-400">Lore</div>
                                    <Textarea rows={4} value={lore} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLore(e.target.value)} placeholder="World history, factions, past wars, titles…" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-zinc-400">Prompt profile</div>
                                    <Textarea rows={4} value={promptProfile} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptProfile(e.target.value)} placeholder="Roleplay style, cadence, scene framing…" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">NSFW preference tags (comma-separated)</div>
                                <Input value={nsfwPreferenceTags} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNsfwPreferenceTags(e.target.value)} placeholder="dominance, praise, teasing…" />
                                <div className="text-xs text-zinc-500">Only applied for adult companions.</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Stats (key:value, comma-separated)</div>
                                <Input value={statsInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatsInput(e.target.value)} placeholder="intellect:90, charm:75, empathy:68" />
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs text-zinc-400">Boundaries (comma-separated)</div>
                                <Input value={boundaries} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBoundaries(e.target.value)} placeholder="adults only, no coercion, no underage themes" />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-1">
                                    <div className="text-xs text-zinc-400">Avatar image URL</div>
                                    <Input value={avatarImageUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvatarImageUrl(e.target.value)} placeholder="https://…" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-zinc-400">Orientation</div>
                                    <Input value={orientation} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrientation(e.target.value)} placeholder="bisexual, pansexual…" />
                                </div>
                                <div className="space-y-1">
                                    <div className="text-xs text-zinc-400">Bucket</div>
                                    <Input value={bucket} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBucket(e.target.value)} placeholder="SAFE or ADULT" />
                                </div>
                            </div>
                        </div>
                    </details>

                    {error && (
                        <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-200">{error}</div>
                    )}
                    {savedMessage && (
                        <div className="rounded-xl border border-emerald-800/50 bg-emerald-900/20 p-3 text-sm text-emerald-200">{savedMessage}</div>
                    )}

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" variant="fuchsia" disabled={submitting || generating}>
                            {submitting ? "Saving…" : mode === "create" ? "Create companion" : "Save changes"}
                        </Button>
                        <a href={mode === "create" ? "/companions" : `/companions/${companion.slug ?? ""}`}>
                            <Button type="button" variant="secondary">Back</Button>
                        </a>
                    </div>
                </form>
            </CardBody>
        </Card>
    );
}

export default CompanionBuilder;
