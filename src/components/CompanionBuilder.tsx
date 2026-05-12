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
    scene?: string;
    background?: string;
    personality?: string;
    wardrobe?: string;
    traits?: string[];
    voice?: string;
    sexuality?: string;
    voiceMeta?: {
        accent?: string;
        voiceId?: string;
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
};

const TRAIT_OPTIONS = [
    // Personality
    "witty", "playful", "caring", "gentle", "shy", "curious", "adventurous",
    "sarcastic", "intellectual", "mysterious", "confident", "loyal", "protective",
    "calm", "energetic", "creative", "empathetic", "independent", "stubborn",
    "honest", "charming", "mischievous", "dreamy", "grounded", "intense",
    "patient", "passionate", "whimsical", "stoic", "warm", "nurturing",
    "mischievous", "rebellious", "poetic", "pragmatic", "flirtatious",
    // Tone / vibe
    "dominant", "submissive", "teasing", "bold", "assertive", "sensual",
    "seductive", "reserved", "earnest", "dry", "dark", "light-hearted",
    "introspective", "outgoing", "magnetic", "commanding", "tender",
] as const;

const ARCHETYPE_CHIPS = [
    // Fantasy creatures
    "Demon", "Devil girl", "Succubus", "Incubus",
    "Elf", "Dark elf", "Wood elf", "High elf",
    "Goblin", "Hobgoblin", "Orc", "Half-orc",
    "Alien", "Android", "Cyborg", "AI entity",
    "Vampire", "Werewolf", "Witch", "Warlock",
    "Fae", "Fairy", "Angel", "Fallen angel",
    "Dragon", "Naga", "Mermaid", "Ghost",
    // Human archetypes
    "Idol", "Athlete", "Scholar", "Rebel",
    "Royalty", "Knight", "Rogue", "Bard",
    "Barista", "Chef", "Artist", "Nurse",
    // Identity-forward
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
                <span className="text-xs text-zinc-500">{hint}</span>
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
                <span>0</span>
                <span>{value}</span>
                <span>100</span>
            </div>
        </label>
    );
}

export function CompanionBuilder({
    mode,
    userEmail,
    allowAdult,
    companion,
}: CompanionBuilderProps) {
    const profile = companion.profile ?? {};
    const sliders = profile.sliders ?? {};

    const [name, setName] = useState(companion.name ?? "");
    const [slug, setSlug] = useState(companion.slug ?? "");
    const [description, setDescription] = useState(companion.description ?? "");
    const [tags, setTags] = useState((companion.tags ?? []).join(", "));
    const [archetype, setArchetype] = useState(companion.archetype ?? "");
    const [gender, setGender] = useState(companion.gender ?? "");
    const [sexuality, setSexuality] = useState((companion.profile as CompanionProfile | null)?.sexuality ?? "");
    const [voice, setVoice] = useState((companion.profile as CompanionProfile | null)?.voice ?? "");
    const [voiceAccent, setVoiceAccent] = useState((companion.profile as CompanionProfile | null)?.voiceMeta?.accent ?? "");
    const [avatarImageUrl, setAvatarImageUrl] = useState((companion.profile as CompanionProfile | null)?.avatarImageUrl ?? "");
    const [lore, setLore] = useState((companion.profile as CompanionProfile | null)?.lore ?? "");
    const [orientation, setOrientation] = useState((companion.profile as CompanionProfile | null)?.orientation ?? "");
    const [bucket, setBucket] = useState((companion.profile as CompanionProfile | null)?.bucket ?? "");
    const [promptProfile, setPromptProfile] = useState((companion.profile as CompanionProfile | null)?.promptProfile ?? "");
    const [aiPersonalityPrompt, setAiPersonalityPrompt] = useState((companion.profile as CompanionProfile | null)?.aiPersonalityPrompt ?? "");
    const [nsfwPreferenceTags, setNsfwPreferenceTags] = useState(
        ((companion.profile as CompanionProfile | null)?.nsfwPreferenceTags ?? []).join(", "),
    );
    const [statsInput, setStatsInput] = useState(
        statsToInput((companion.profile as CompanionProfile | null)?.stats),
    );
    const [visibility, setVisibility] = useState<Visibility>(
        companion.visibility ?? "UNLISTED",
    );
    const [contentRating, setContentRating] = useState<ContentRating>(
        companion.contentRating ?? "SAFE",
    );

    const [scenePreset, setScenePreset] = useState(
        SCENE_PRESETS.includes(
            (profile.scene ?? "") as (typeof SCENE_PRESETS)[number],
        )
            ? (profile.scene as (typeof SCENE_PRESETS)[number])
            : "",
    );
    const [sceneCustom, setSceneCustom] = useState(
        profile.scene &&
            !SCENE_PRESETS.includes(profile.scene as (typeof SCENE_PRESETS)[number])
            ? profile.scene
            : "",
    );

    const [background, setBackground] = useState(profile.background ?? "");
    const [personality, setPersonality] = useState(profile.personality ?? "");
    const [wardrobe, setWardrobe] = useState(profile.wardrobe ?? "");
    const [traitList, setTraitList] = useState<string[]>(
        Array.isArray(profile.traits) ? profile.traits.slice(0, 10) : [],
    );
    const [boundaries, setBoundaries] = useState(
        Array.isArray(profile.boundaries) ? profile.boundaries.join(", ") : "",
    );

    const [warmth, setWarmth] = useState(Number(sliders.warmth ?? 60));
    const [humor, setHumor] = useState(Number(sliders.humor ?? 55));
    const [flirtiness, setFlirtiness] = useState(
        Number(sliders.flirtiness ?? (allowAdult ? 35 : 10)),
    );
    const [dominance, setDominance] = useState(Number(sliders.dominance ?? 30));
    const [kink, setKink] = useState(Number(sliders.kink ?? 0));

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [savedMessage, setSavedMessage] = useState<string | null>(null);

    const computedSlug = useMemo(() => {
        if (mode === "edit") return slug;
        return slugify(name);
    }, [mode, name, slug]);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSavedMessage(null);

        try {
            if (!allowAdult && contentRating === "ADULT") {
                throw new Error("Age verification is required for 18+ companions.");
            }

            const finalScene = sceneCustom.trim() || scenePreset || "";

            const payload = {
                name: name.trim(),
                slug:
                    mode === "create" ? computedSlug || slugify(name) : companion.slug,
                description: description.trim(),
                tags: tags
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean),
                gender: gender.trim() || null,
                archetype: archetype.trim() || null,
                visibility,
                contentRating,
                profile: {
                    scene: finalScene,
                    background: background.trim(),
                    personality: personality.trim(),
                    wardrobe: wardrobe.trim(),
                    traits: traitList,
                    voice: voice || null,
                    sexuality: sexuality.trim() || null,
                    voiceMeta: {
                        accent: voiceAccent.trim(),
                        voiceId: voice || "",
                    },
                    avatarImageUrl: avatarImageUrl.trim(),
                    lore: lore.trim(),
                    orientation: orientation.trim(),
                    bucket: bucket.trim(),
                    promptProfile: promptProfile.trim(),
                    aiPersonalityPrompt: aiPersonalityPrompt.trim(),
                    nsfwPreferenceTags: nsfwPreferenceTags
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                    stats: parseStatsInput(statsInput),
                    sliders: {
                        warmth,
                        humor,
                        flirtiness,
                        dominance,
                        kink,
                    },
                    boundaries: boundaries
                        .split(",")
                        .map((x) => x.trim())
                        .filter(Boolean),
                },
            };

            const endpoint =
                mode === "create"
                    ? "/api/companions"
                    : `/api/companions/${encodeURIComponent(companion.slug ?? "")}`;
            const method = mode === "create" ? "POST" : "PATCH";

            const res = await fetch(endpoint, {
                method,
                headers: {
                    "content-type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const json = await res.json().catch(() => null);

            if (!res.ok) {
                throw new Error(json?.error || "Failed to save companion.");
            }

            if (mode === "create" && json?.editUrl) {
                window.location.href = json.editUrl;
                return;
            }

            setSavedMessage("Saved.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <Card className="border-fuchsia-900/40 bg-black/90 shadow-[0_0_60px_rgba(168,85,247,0.07)]">
            <CardHeader
                title={mode === "create" ? "Companion Builder" : "Edit Companion"}
                subtitle={
                    mode === "create"
                        ? "Create the profile first. After saving, you can generate photos and video."
                        : "Update the profile, tone, and settings for this companion."
                }
                right={
                    <details className="group">
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
                }
            />

            <CardBody className="space-y-4">
                <form onSubmit={onSubmit} className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Name</div>
                            <Input
                                value={name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setName(e.target.value)
                                }
                                placeholder="Nova"
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Slug</div>
                            <Input
                                value={mode === "create" ? computedSlug : slug}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setSlug(e.target.value)
                                }
                                placeholder="nova"
                                disabled={mode === "create"}
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Tags (comma-separated)</div>
                            <Input
                                value={tags}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTags(e.target.value)}
                                placeholder="romance, cozy, fantasy"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Archetype</div>
                            <Input
                                value={archetype}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setArchetype(e.target.value)}
                                placeholder="demon noble, fae trickster, trans idol…"
                            />
                            <details className="group">
                                <summary className="flex cursor-pointer select-none list-none items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 px-3 py-2 text-xs font-medium transition-colors hover:border-fuchsia-500/50 hover:text-fuchsia-300 text-zinc-400">
                                    <svg className="h-3 w-3 flex-none transition-transform group-open:rotate-180" fill="none" viewBox="0 0 10 6" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
                                    </svg>
                                    Browse archetypes
                                    {archetype && (
                                        <span className="ml-auto rounded-full bg-fuchsia-500/15 px-2 py-0.5 text-fuchsia-300">
                                            {archetype}
                                        </span>
                                    )}
                                </summary>
                                <div className="mt-2 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                                    <div className="flex flex-wrap gap-1.5">
                                        {ARCHETYPE_CHIPS.map((chip) => (
                                            <button
                                                key={chip}
                                                type="button"
                                                onClick={() => setArchetype(chip)}
                                                className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${archetype === chip
                                                        ? "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-200"
                                                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-fuchsia-500/40 hover:text-zinc-200"
                                                    }`}
                                            >
                                                {chip}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </details>
                        </div>

                        <label className="space-y-1">
                            <div className="text-xs text-zinc-400">Gender identity</div>
                            <select
                                value={gender}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setGender(e.target.value)}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                            >
                                <option value="">Unspecified</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                                <option value="non-binary">Non-binary</option>
                                <option value="trans-woman">Transgender woman</option>
                                <option value="trans-man">Transgender man</option>
                                <option value="gender-fluid">Gender-fluid</option>
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                            <div className="text-xs text-zinc-400">Sexual orientation</div>
                            <select
                                value={sexuality}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSexuality(e.target.value)}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                            >
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
                            <select
                                value={voice}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setVoice(e.target.value)}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                            >
                                {VOICE_PRESETS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Voice / accent</div>
                            <Input
                                value={voiceAccent}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setVoiceAccent(e.target.value)}
                                placeholder="British, Southern US, Tokyo..."
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Avatar image URL</div>
                            <Input
                                value={avatarImageUrl}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAvatarImageUrl(e.target.value)}
                                placeholder="https://..."
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Orientation</div>
                            <Input
                                value={orientation}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrientation(e.target.value)}
                                placeholder="bisexual, pansexual..."
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Bucket</div>
                            <Input
                                value={bucket}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBucket(e.target.value)}
                                placeholder="SAFE or ADULT"
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                            <div className="text-xs text-zinc-400">Visibility</div>
                            <select
                                value={visibility}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setVisibility(e.target.value as Visibility)
                                }
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                            >
                                <option value="PUBLIC">PUBLIC</option>
                                <option value="UNLISTED">UNLISTED</option>
                                <option value="PRIVATE">PRIVATE</option>
                            </select>
                        </label>

                        <label className="space-y-1">
                            <div className="text-xs text-zinc-400">Content rating</div>
                            <select
                                value={contentRating}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setContentRating(e.target.value as ContentRating)
                                }
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                            >
                                <option value="SAFE">SAFE</option>
                                {allowAdult ? <option value="ADULT">ADULT</option> : null}
                            </select>
                        </label>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs text-zinc-400">Description</div>
                        <Textarea
                            rows={3}
                            value={description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                setDescription(e.target.value)
                            }
                            placeholder="Warm, supportive, playful..."
                            required
                        />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1">
                            <div className="text-xs text-zinc-400">Scene preset</div>
                            <select
                                value={scenePreset}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                    setScenePreset(e.target.value)
                                }
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                            >
                                <option value="">(none)</option>
                                {SCENE_PRESETS.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                            <div className="text-[11px] text-zinc-500">
                                Pick a quick default setting.
                            </div>
                        </label>

                        <label className="space-y-1">
                            <div className="text-xs text-zinc-400">Custom scene</div>
                            <Input
                                value={sceneCustom}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setSceneCustom(e.target.value)
                                }
                                placeholder="Your next-door neighbor's kitchen..."
                            />
                            <div className="text-[11px] text-zinc-500">
                                If filled, custom overrides preset.
                            </div>
                        </label>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-xs text-zinc-400">Traits</div>
                                <div className="text-[11px] text-zinc-500">{traitList.length}/10</div>
                            </div>
                            <select
                                value=""
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    if (traitList.length >= 10) return;
                                    if (traitList.includes(val)) return;
                                    setTraitList((prev) => [...prev, val]);
                                    e.target.value = "";
                                }}
                                disabled={traitList.length >= 10}
                                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 disabled:opacity-50"
                            >
                                <option value="">
                                    {traitList.length >= 10 ? "Limit reached (10)" : "Add a trait…"}
                                </option>
                                {TRAIT_OPTIONS.filter((t) => !traitList.includes(t)).map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                            {traitList.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {traitList.map((t) => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setTraitList((prev) => prev.filter((x) => x !== t))}
                                            className="inline-flex items-center gap-1 rounded-full border border-fuchsia-900/50 bg-fuchsia-950/30 px-2.5 py-1 text-xs text-fuchsia-200 hover:bg-red-950/40 hover:border-red-900/60 hover:text-red-300 transition"
                                        >
                                            {t} ✕
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-[11px] text-zinc-600 pt-1">No traits selected yet.</div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Wardrobe / look</div>
                            <Textarea
                                rows={4}
                                value={wardrobe}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    setWardrobe(e.target.value)
                                }
                                placeholder="Outfits, accessories, style..."
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">
                                Personality (voice + vibe)
                            </div>
                            <Textarea
                                rows={6}
                                value={personality}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    setPersonality(e.target.value)
                                }
                                placeholder="How they speak, vibe, boundaries, what they enjoy..."
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">
                                Backstory / scenario background
                            </div>
                            <Textarea
                                rows={6}
                                value={background}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                    setBackground(e.target.value)
                                }
                                placeholder="Example: Your next-door neighbor has had a crush on you for months..."
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Lore</div>
                            <Textarea
                                rows={5}
                                value={lore}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLore(e.target.value)}
                                placeholder="World history, factions, past wars, titles..."
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">AI personality prompt</div>
                            <Textarea
                                rows={5}
                                value={aiPersonalityPrompt}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPersonalityPrompt(e.target.value)}
                                placeholder="Hard prompt rules for behavior, tone, and pacing..."
                            />
                        </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-2">
                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">Prompt profile</div>
                            <Textarea
                                rows={4}
                                value={promptProfile}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPromptProfile(e.target.value)}
                                placeholder="Roleplay style, cadence, scene framing..."
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="text-xs text-zinc-400">NSFW preference tags (comma-separated)</div>
                            <Input
                                value={nsfwPreferenceTags}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNsfwPreferenceTags(e.target.value)}
                                placeholder="dominance, praise, teasing..."
                            />
                            <div className="text-xs text-zinc-500">Only used for adult companions.</div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs text-zinc-400">Companion stats (key:value, comma-separated)</div>
                        <Input
                            value={statsInput}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatsInput(e.target.value)}
                            placeholder="intellect:90, charm:75, empathy:68"
                        />
                    </div>

                    <div className="space-y-2">
                        <div className="text-xs text-zinc-400">
                            Boundaries (comma-separated)
                        </div>
                        <Input
                            value={boundaries}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setBoundaries(e.target.value)
                            }
                            placeholder="adults only, no coercion, no underage themes"
                        />
                    </div>

                    <div className="rounded-2xl border border-fuchsia-900/40 bg-black-950/10 p-4">
                        <div className="mb-3">
                            <div className="text-sm font-semibold text-zinc-100">
                                Personality sliders
                            </div>
                            <div className="text-xs text-zinc-500">
                                These shape tone and behavior.
                            </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <RangeRow
                                label="Warmth"
                                hint="cold → caring"
                                value={warmth}
                                onChange={setWarmth}
                            />
                            <RangeRow
                                label="Humor"
                                hint="serious → witty"
                                value={humor}
                                onChange={setHumor}
                            />
                            <RangeRow
                                label="Flirtiness"
                                hint="reserved → flirty"
                                value={flirtiness}
                                onChange={setFlirtiness}
                            />
                            <RangeRow
                                label="Dominance"
                                hint="soft → assertive"
                                value={dominance}
                                onChange={setDominance}
                            />
                            {contentRating === "ADULT" ? (
                                <RangeRow
                                    label="Kink intensity"
                                    hint="vanilla → BDSM"
                                    value={kink}
                                    onChange={setKink}
                                />
                            ) : null}
                        </div>

                        {!allowAdult && contentRating === "ADULT" ? (
                            <div className="mt-3 text-xs text-zinc-500">
                                Adult editing is locked until age verification.
                            </div>
                        ) : null}
                    </div>

                    {error ? (
                        <div className="rounded-xl border border-red-800/50 bg-red-900/20 p-3 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    {savedMessage ? (
                        <div className="rounded-xl border border-emerald-800/50 bg-emerald-900/20 p-3 text-sm text-emerald-200">
                            {savedMessage}
                        </div>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                        <Button type="submit" variant="fuchsia" disabled={submitting}>
                            {submitting
                                ? "Saving..."
                                : mode === "create"
                                    ? "Create companion"
                                    : "Save changes"}
                        </Button>

                        <a
                            href={
                                mode === "create"
                                    ? "/companions"
                                    : `/companions/${companion.slug ?? ""}`
                            }
                        >
                            <Button type="button" variant="secondary">
                                Back
                            </Button>
                        </a>
                    </div>
                </form>
            </CardBody>
        </Card>
    );
}

export default CompanionBuilder;
