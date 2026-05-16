"use client";

import React, { useMemo, useState } from "react";
import {
    BookOpen,
    Brain,
    Database,
    Edit2,
    Feather,
    Image as ImageIcon,
    PenLine,
    Save,
    Sparkles,
    Upload,
    Wand2,
    Workflow,
    X,
} from "lucide-react";
import { Badge, Input, Textarea, cn } from "@/components/ui";

type StudioWorld = {
    id: string;
    slug: string;
    name: string;
    summary: string;
    setting: string;
    memberCount: number;
    messageCount: number;
};

type StudioCompanion = {
    id: string;
    slug: string;
    name: string;
    description: string;
    tags: string[];
    contentRating: "SAFE" | "ADULT";
    visibility: string;
    editHref: string;
    profile: {
        tagline?: string;
        role?: string;
        personality?: string;
        appearance?: string;
        backstory?: string;
        speakingStyle?: string;
        goals?: string;
        scenario?: string;
        lore?: string;
        memory?: string;
        greeting?: string;
        exampleDialogue?: string;
        systemPrompt?: string;
        postHistoryInstructions?: string;
        creatorNotes?: string;
        sliders?: {
            jealousy: number;
            dominance: number;
            affection: number;
            empathy: number;
        };
    };
};

type WorldStudioClientProps = {
    worlds: StudioWorld[];
    companions: StudioCompanion[];
    ageVerified: boolean;
};

const workspaceTabs = ["New World", "New Story", "New Scene"] as const;
const rosterTabs = ["New", "Generate"] as const;
const builderTabs = ["Lorebook", "Memory", "Personas", "Data", "Scenario Wizard"] as const;
const characterActions = [
    { label: "Generate", icon: Wand2 },
    { label: "Rewrite", icon: PenLine },
    { label: "Expand", icon: Feather },
    { label: "Image", icon: ImageIcon },
    { label: "Save", icon: Save },
] as const;

type ImagePanelTab = "upload" | "generate" | "edit";

function getCharacterDraft(companion?: StudioCompanion) {
    const profile = companion?.profile ?? {};

    return {
        name: companion?.name ?? "",
        tagline: profile.tagline ?? companion?.description ?? "",
        role: profile.role ?? "",
        personality: profile.personality ?? "",
        appearance: profile.appearance ?? "",
        backstory: profile.backstory ?? "",
        speakingStyle: profile.speakingStyle ?? "",
        goals: profile.goals ?? "",
        scenario: profile.scenario ?? "",
        firstMessage: profile.greeting ?? "",
        exampleDialogue: profile.exampleDialogue ?? "",
        systemPrompt: profile.systemPrompt ?? "",
        postHistoryInstructions: profile.postHistoryInstructions ?? "",
        creatorNotes: profile.creatorNotes ?? "",
        contentRating: (companion?.contentRating ?? "SAFE") as "SAFE" | "ADULT",
        sliders: {
            jealousy: profile.sliders?.jealousy ?? 20,
            dominance: profile.sliders?.dominance ?? 20,
            affection: profile.sliders?.affection ?? 60,
            empathy: profile.sliders?.empathy ?? 50,
        },
    };
}

function SliderField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
}) {
    return (

        <label className="block">
            <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-cyan-100/80">{label}</span>
                <span className="text-xs font-mono text-cyan-300">{value}</span>
            </div>
            <input
                type="range"
                min={0}
                max={100}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
                className="w-full accent-cyan-400"
            />
        </label>
    );
}

function TabButton({
    children,
    active,
    className,
    onClick,
}: {
    children: React.ReactNode;
    active?: boolean;
    className?: string;
    onClick?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "inline-flex h-10 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition",
                active
                    ? "border-cyan-300/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] text-white shadow-sm shadow-cyan-950/50"
                    : "border-zinc-800 bg-zinc-950/80 text-zinc-400 hover:border-cyan-900/70 hover:text-zinc-100",
                className,
            )}
        >
            {children}
        </button>
    );
}

function Field({
    label,
    value,
    rows = 3,
    onChange,
}: {
    label: string;
    value: string;
    rows?: number;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-cyan-100/80">
                {label}
            </span>
            {rows <= 1 ? (
                <Input value={value} onChange={(event) => onChange(event.target.value)} />
            ) : (
                <Textarea
                    value={value}
                    rows={rows}
                    onChange={(event) => onChange(event.target.value)}
                    className="resize-y"
                />
            )}
        </label>
    );
}

export function WorldStudioClient({ worlds, companions, ageVerified }: WorldStudioClientProps) {
    const [workspaceTab, setWorkspaceTab] = useState<(typeof workspaceTabs)[number]>("New World");
    const [rosterTab, setRosterTab] = useState<(typeof rosterTabs)[number]>("New");
    const [builderTab, setBuilderTab] = useState<(typeof builderTabs)[number]>("Lorebook");
    const [selectedWorldId, setSelectedWorldId] = useState(worlds[0]?.id ?? "");
    const [selectedCompanionId, setSelectedCompanionId] = useState(companions[0]?.id ?? "");
    const [characterSeed, setCharacterSeed] = useState("");
    const [imagePanelOpen, setImagePanelOpen] = useState(false);
    const [imagePanelTab, setImagePanelTab] = useState<ImagePanelTab>("generate");
    const [imagePrompt, setImagePrompt] = useState("");
    const [statusMsg, setStatusMsg] = useState<{ text: string; ok: boolean } | null>(null);
    const [busy, setBusy] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const selectedWorld = worlds.find((world) => world.id === selectedWorldId) ?? worlds[0];
    const selectedCompanion = companions.find((companion) => companion.id === selectedCompanionId) ?? companions[0];
    const initialDraft = useMemo(() => getCharacterDraft(selectedCompanion), [selectedCompanion]);
    const [draft, setDraft] = useState(initialDraft);

    function selectCompanion(companion: StudioCompanion) {
        setSelectedCompanionId(companion.id);
        setDraft(getCharacterDraft(companion));
    }

    function updateDraft(key: keyof typeof draft, value: string) {
        setDraft((current) => ({ ...current, [key]: value }));
    }

    function updateSlider(key: keyof typeof draft.sliders, value: number) {
        setDraft((current) => ({ ...current, sliders: { ...current.sliders, [key]: value } }));
    }

    function flash(text: string, ok = true) {
        setStatusMsg({ text, ok });
        setTimeout(() => setStatusMsg(null), 3500);
    }

    async function doSave(currentDraft = draft) {
        if (!selectedCompanion) return false;
        const res = await fetch(`/api/companions/${selectedCompanion.slug}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                name: currentDraft.name,
                description: currentDraft.tagline || selectedCompanion.description,
                tags: selectedCompanion.tags,
                visibility: selectedCompanion.visibility,
                contentRating: currentDraft.contentRating,
                profile: {
                    tagline: currentDraft.tagline,
                    role: currentDraft.role,
                    personality: currentDraft.personality,
                    appearance: currentDraft.appearance,
                    backstory: currentDraft.backstory,
                    speakingStyle: currentDraft.speakingStyle,
                    goals: currentDraft.goals,
                    scenario: currentDraft.scenario,
                    greeting: currentDraft.firstMessage,
                    exampleDialogue: currentDraft.exampleDialogue,
                    systemPrompt: currentDraft.systemPrompt,
                    postHistoryInstructions: currentDraft.postHistoryInstructions,
                    creatorNotes: currentDraft.creatorNotes,
                    behaviorMeta: {
                        jealousyLevel: currentDraft.sliders.jealousy,
                        dominanceLevel: currentDraft.sliders.dominance,
                        affectionLevel: currentDraft.sliders.affection,
                        empathyLevel: currentDraft.sliders.empathy,
                    },
                },
            }),
        });
        const data = await res.json();
        return data.ok === true;
    }

    async function handleSave() {
        if (!selectedCompanion || busy) return;
        setBusy(true);
        try {
            const ok = await doSave();
            if (ok) flash("Saved!");
            else flash("Save failed.", false);
        } catch {
            flash("Save failed.", false);
        } finally {
            setBusy(false);
        }
    }

    async function handleGenerate() {
        if (!selectedCompanion || busy) return;
        setBusy(true);
        flash("Generating character…");
        try {
            const res = await fetch("/api/studio/character", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "generate", seed: characterSeed, draft }),
            });
            const data = await res.json();
            if (data.ok && data.fields) {
                const newDraft = { ...draft, ...data.fields };
                setDraft(newDraft);
                flash("Generated — saving…");
                const saved = await doSave(newDraft);
                if (saved) {
                    flash("Saved! Open the image panel to generate a portrait.");
                    setImagePanelTab("generate");
                    setImagePanelOpen(true);
                } else {
                    flash("Generated but save failed.", false);
                }
            } else {
                flash(data.error ?? "Generation failed.", false);
            }
        } catch {
            flash("Generation failed.", false);
        } finally {
            setBusy(false);
        }
    }

    async function handleRewrite() {
        if (!selectedCompanion || busy) return;
        const field = "personality";
        setBusy(true);
        flash("Rewriting personality…");
        try {
            const res = await fetch("/api/studio/character", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "rewrite", field, fieldValue: draft[field as keyof typeof draft], draft }),
            });
            const data = await res.json();
            if (data.ok) {
                updateDraft(field as keyof typeof draft, data.text);
                flash("Rewritten!");
            } else {
                flash(data.error ?? "Rewrite failed.", false);
            }
        } catch {
            flash("Rewrite failed.", false);
        } finally {
            setBusy(false);
        }
    }

    async function handleExpand() {
        if (!selectedCompanion || busy) return;
        const field = "backstory";
        setBusy(true);
        flash("Expanding backstory…");
        try {
            const res = await fetch("/api/studio/character", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mode: "expand", field, fieldValue: draft[field as keyof typeof draft], draft }),
            });
            const data = await res.json();
            if (data.ok) {
                updateDraft(field as keyof typeof draft, data.text);
                flash("Expanded!");
            } else {
                flash(data.error ?? "Expand failed.", false);
            }
        } catch {
            flash("Expand failed.", false);
        } finally {
            setBusy(false);
        }
    }

    async function handleImageUpload(file: File) {
        if (!selectedCompanion || uploadingImage) return;
        setUploadingImage(true);
        flash("Uploading image…");
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("companionId", selectedCompanion.id);
            const res = await fetch("/api/media/upload", { method: "POST", body: form });
            const data = await res.json();
            if (data.ok) flash("Image uploaded!");
            else flash(data.error ?? "Upload failed.", false);
        } catch {
            flash("Upload failed.", false);
        } finally {
            setUploadingImage(false);
        }
    }

    async function handleImageGenerate() {
        if (!selectedCompanion || generatingImage) return;
        const prompt = imagePrompt || draft.appearance || selectedCompanion.description;
        if (!prompt) { flash("Add an appearance description or prompt first.", false); return; }
        setGeneratingImage(true);
        flash("Queuing image generation…");
        try {
            const res = await fetch("/api/media/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    companionId: selectedCompanion.id,
                    prompt,
                    contentRating: selectedCompanion.contentRating,
                }),
            });
            const data = await res.json();
            if (data.ok) flash("Image queued! Check the companion page.");
            else flash(data.error ?? "Generation failed.", false);
        } catch {
            flash("Generation failed.", false);
        } finally {
            setGeneratingImage(false);
        }
    }

    const actionHandlers: Record<string, (() => void) | undefined> = {
        Generate: handleGenerate,
        Rewrite: handleRewrite,
        Expand: handleExpand,
        Image: () => setImagePanelOpen((open) => !open),
        Save: handleSave,
    };

    return (
        <div class="custom-bg">
            <div className="min-h-[calc(100vh-140px)] rounded-lg border border-cyan-900/40 bg-[linear-gradient(360deg,#17023e_50%,#0f2b7d_83%,#0b1d82_100%)] p-3 text-zinc-100 shadow-2xl shadow-blue-950/40 sm:p-4">
                <div className={cn(
                    "grid min-h-[calc(100vh-172px)] gap-4",
                    editMode
                        ? "2xl:grid-cols-[1fr]"
                        : "2xl:grid-cols-[minmax(430px,0.9fr)_minmax(720px,1.35fr)]",
                )}>
                    <section className={cn(
                        "rounded-lg border border-cyan-900/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4 2xl:col-span-2",
                        editMode && "hidden",
                    )}>
                        <header className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold text-white">{selectedWorld?.name ?? "No world selected"}</div>
                                <div className="mt-1 text-sm text-cyan-100/75">
                                    {workspaceTab} · {selectedWorld?.summary ?? "Create or select a world to begin."}
                                </div>
                            </div>
                            <Badge>{selectedWorld ? `${selectedWorld.messageCount} turns` : "World builder"}</Badge>
                        </header>

                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
                            <div className="rounded-lg border border-cyan-950/50 bg-zinc-950/55 p-4 lg:col-span-2">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                    <Workflow className="h-4 w-4 text-cyan-100" />
                                    Scene board
                                </div>
                                <p className="mt-2 line-clamp-3 text-sm leading-6 text-cyan-100/75">
                                    {selectedWorld?.setting ||
                                        "This world workspace is reserved for the selected world, story title, active scene, and future dungeon state."}
                                </p>
                            </div>

                            <div className="rounded-lg border border-cyan-950/50 bg-zinc-950/45 p-4">
                                <div className="text-sm font-semibold text-white">Active Builder</div>
                                <div className="mt-1 text-xs leading-5 text-cyan-100/70">
                                    {builderTab} is selected for {selectedCompanion?.name ?? "the current character"}.
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className={cn(
                        "flex min-h-0 flex-col rounded-lg border border-cyan-900/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4",
                        editMode && "hidden",
                    )}>
                        <header className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold text-white">Workspace</div>
                                <div className="text-xs text-cyan-100/70">World, story, and scene inventory</div>
                            </div>
                            <Sparkles className="h-5 w-5 text-cyan-100" />
                        </header>

                        <div className="mt-4 grid grid-cols-3 gap-2">
                            {workspaceTabs.map((tab) => (
                                <TabButton
                                    key={tab}
                                    active={workspaceTab === tab}
                                    onClick={() => setWorkspaceTab(tab)}
                                    className="w-full"
                                >
                                    {tab}
                                </TabButton>
                            ))}
                        </div>

                        <div className="mt-3 min-h-[300px] flex-1 overflow-y-auto rounded-lg border border-cyan-950/40 bg-zinc-950/50 p-2">
                            {worlds.length > 0 ? (
                                <div className="space-y-2">
                                    {worlds.map((world) => (
                                        <button
                                            key={world.id}
                                            type="button"
                                            onClick={() => setSelectedWorldId(world.id)}
                                            className={cn(
                                                "w-full rounded-lg border p-3 text-left transition",
                                                selectedWorld?.id === world.id
                                                    ? "border-cyan-200 bg-cyan-400/15"
                                                    : "border-cyan-950/60 bg-zinc-950/60 hover:border-cyan-500/60",
                                            )}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="truncate font-semibold text-white">{world.name}</div>
                                                <Badge>{world.memberCount} players</Badge>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-cyan-100/75">
                                                {world.summary}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-cyan-900/60 p-5 text-center text-sm text-cyan-100/70">
                                    No worlds yet. Use New World to start the first one.
                                </div>
                            )}
                        </div>

                        <div className="mt-4 min-h-[380px] rounded-lg border border-cyan-950/50 bg-zinc-950/55 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <div className="text-lg font-semibold text-white">Roster</div>
                                    <div className="text-xs text-cyan-100/70">Characters linked to editing</div>
                                </div>
                                <BookOpen className="h-5 w-5 text-cyan-100" />
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {rosterTabs.map((tab) => (
                                    <TabButton
                                        key={tab}
                                        active={rosterTab === tab}
                                        onClick={() => setRosterTab(tab)}
                                        className="w-full"
                                    >
                                        {tab}
                                    </TabButton>
                                ))}
                            </div>

                            <label className="mt-3 block">
                                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-cyan-100/80">
                                    Character Seed
                                </span>
                                <Input
                                    value={characterSeed}
                                    onChange={(event) => setCharacterSeed(event.target.value)}
                                    placeholder="e.g. moonlit ranger with old debts"
                                />
                            </label>

                            <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-cyan-950/50 bg-zinc-950/50 p-2">
                                {companions.length > 0 ? (
                                    <div className="space-y-2">
                                        {companions.map((companion) => (
                                            <button
                                                key={companion.id}
                                                type="button"
                                                onClick={() => selectCompanion(companion)}
                                                className={cn(
                                                    "w-full rounded-lg border p-3 text-left transition",
                                                    selectedCompanion?.id === companion.id
                                                        ? "border-cyan-200 bg-cyan-400/15"
                                                        : "border-cyan-950/60 bg-zinc-950/60 hover:border-cyan-500/60",
                                                )}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="truncate font-semibold text-white">{companion.name}</span>
                                                    <Badge tone={companion.contentRating === "ADULT" ? "adult" : "safe"}>
                                                        {companion.contentRating}
                                                    </Badge>
                                                </div>
                                                <p className="mt-1 line-clamp-1 text-xs text-cyan-100/70">
                                                    {companion.description}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg border border-dashed border-cyan-900/60 p-4 text-center text-sm text-cyan-100/70">
                                        No companions in your roster yet.
                                    </div>
                                )}
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {builderTabs.map((tab) => (
                                    <TabButton
                                        key={tab}
                                        active={builderTab === tab}
                                        onClick={() => setBuilderTab(tab)}
                                        className={tab === "Scenario Wizard" ? "col-span-2" : ""}
                                    >
                                        {tab}
                                    </TabButton>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className={cn(
                        "relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-cyan-900/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4",
                        editMode && "2xl:col-span-2",
                    )}>
                        <header className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <div className="text-lg font-semibold text-white">Character</div>
                                <div className="text-xs text-cyan-100/70">
                                    {selectedCompanion ? `Editing ${selectedCompanion.name}` : "Create a SillyTavern V2-style card"}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setEditMode((m) => !m)}
                                    className="inline-flex h-9 items-center justify-center rounded-lg border border-cyan-200/40 bg-zinc-950/70 px-3 text-sm font-semibold text-white hover:bg-zinc-900"
                                >
                                    {editMode ? "← Back" : "Edit Full Page"}
                                </button>
                            </div>
                        </header>

                        {statusMsg && (
                            <div
                                className={cn(
                                    "mt-3 rounded-lg px-3 py-2 text-xs font-semibold",
                                    statusMsg.ok
                                        ? "bg-cyan-900/60 text-cyan-100"
                                        : "bg-red-900/60 text-red-200",
                                )}
                            >
                                {statusMsg.text}
                            </div>
                        )}

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                            {characterActions.map(({ label, icon: Icon }) => (
                                <TabButton
                                    key={label}
                                    active={(label === "Image" && imagePanelOpen) || (busy && label !== "Image")}
                                    className="h-10 gap-1.5 px-2 text-xs"
                                    onClick={actionHandlers[label]}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {label}
                                </TabButton>
                            ))}
                        </div>

                        {/* Image panel — slides in from the right */}
                        <div
                            className={cn(
                                "absolute inset-y-0 right-0 z-20 flex w-full max-w-sm flex-col rounded-lg border border-cyan-700/60 bg-[linear-gradient(160deg,#0b1d82_0%,#00457c_100%)] shadow-2xl transition-transform duration-300 ease-in-out sm:w-96",
                                imagePanelOpen ? "translate-x-0" : "translate-x-full",
                            )}
                        >
                            <div className="flex items-center justify-between border-b border-cyan-900/50 px-4 py-3">
                                <div>
                                    <div className="text-sm font-semibold text-white">
                                        {selectedCompanion ? `${selectedCompanion.name}'s Image` : "Companion Image"}
                                    </div>
                                    <div className="text-xs text-cyan-100/60">Upload, generate, or edit</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setImagePanelOpen(false)}
                                    className="rounded-lg p-1.5 text-cyan-100/60 transition hover:bg-zinc-950/40 hover:text-white"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="flex gap-1 border-b border-cyan-900/50 px-4 py-2">
                                {(
                                    [
                                        { key: "upload", label: "Upload", icon: Upload },
                                        { key: "generate", label: "Generate", icon: Sparkles },
                                        { key: "edit", label: "Edit", icon: Edit2 },
                                    ] as { key: ImagePanelTab; label: string; icon: React.ElementType }[]
                                ).map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => setImagePanelTab(key)}
                                        className={cn(
                                            "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition",
                                            imagePanelTab === key
                                                ? "border-cyan-300/50 bg-zinc-950/70 text-white"
                                                : "border-transparent text-cyan-100/60 hover:text-white",
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-4">
                                {imagePanelTab === "upload" && (
                                    <div className="flex h-full flex-col gap-4">
                                        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-cyan-700/60 bg-zinc-950/40 px-4 py-10 text-center transition hover:border-cyan-400/60 hover:bg-zinc-950/60">
                                            <Upload className="h-8 w-8 text-cyan-300/60" />
                                            <div>
                                                <p className="text-sm font-semibold text-white">
                                                    {uploadingImage ? "Uploading…" : "Click to upload"}
                                                </p>
                                                <p className="mt-0.5 text-xs text-cyan-100/50">PNG, JPG, or WEBP · max 8 MB</p>
                                            </div>
                                            <input
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                className="sr-only"
                                                disabled={uploadingImage}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(file);
                                                }}
                                            />
                                        </label>
                                    </div>
                                )}

                                {imagePanelTab === "generate" && (
                                    <div className="flex h-full flex-col gap-4">
                                        <label className="block">
                                            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-cyan-100/80">
                                                Prompt
                                            </span>
                                            <Textarea
                                                value={imagePrompt}
                                                rows={4}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setImagePrompt(e.target.value)}
                                                placeholder={
                                                    selectedCompanion?.profile?.appearance
                                                        ? selectedCompanion.profile.appearance
                                                        : "Describe the image you want to generate…"
                                                }
                                                className="resize-none"
                                            />
                                        </label>
                                        <div className="rounded-lg border border-cyan-950/50 bg-zinc-950/40 p-3 text-xs text-cyan-100/60">
                                            The appearance field will be used as a base prompt if left blank.
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleImageGenerate}
                                            disabled={generatingImage}
                                            className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg border border-cyan-300/40 bg-zinc-950/60 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-900 disabled:opacity-50"
                                        >
                                            <Sparkles className="h-4 w-4" />
                                            {generatingImage ? "Queuing…" : "Generate image"}
                                        </button>
                                    </div>
                                )}

                                {imagePanelTab === "edit" && (
                                    <div className="flex h-full flex-col gap-4">
                                        <div className="flex aspect-square items-center justify-center rounded-xl border border-cyan-950/60 bg-zinc-950/50">
                                            <div className="text-center text-xs text-cyan-100/40">
                                                <ImageIcon className="mx-auto mb-2 h-10 w-10 opacity-30" />
                                                No image set yet
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            {["Adjust lighting", "Change background", "Refine style", "Upscale"].map(
                                                (action) => (
                                                    <button
                                                        key={action}
                                                        type="button"
                                                        className="flex w-full items-center gap-2 rounded-lg border border-cyan-950/60 bg-zinc-950/50 px-3 py-2.5 text-sm text-cyan-100/80 transition hover:border-cyan-500/50 hover:text-white"
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5 shrink-0" />
                                                        {action}
                                                    </button>
                                                ),
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-cyan-950/50 bg-zinc-950/55 p-4">

                            {/* Content Rating */}
                            <div className="mb-4">
                                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-cyan-100/80">
                                    Content Rating
                                </span>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => updateDraft("contentRating", "SAFE")}
                                        className={cn(
                                            "flex-1 rounded-lg border py-2 text-sm font-semibold transition",
                                            draft.contentRating === "SAFE"
                                                ? "border-cyan-300/50 bg-cyan-700/40 text-white"
                                                : "border-zinc-700 bg-zinc-950/60 text-zinc-400 hover:text-white",
                                        )}
                                    >
                                        Safe
                                    </button>
                                    {ageVerified ? (
                                        <button
                                            type="button"
                                            onClick={() => updateDraft("contentRating", "ADULT")}
                                            className={cn(
                                                "flex-1 rounded-lg border py-2 text-sm font-semibold transition",
                                                draft.contentRating === "ADULT"
                                                    ? "border-rose-400/50 bg-rose-900/40 text-white"
                                                    : "border-zinc-700 bg-zinc-950/60 text-zinc-400 hover:text-white",
                                            )}
                                        >
                                            Adult
                                        </button>
                                    ) : (
                                        <div className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950/40 py-2 text-center text-xs text-zinc-500">
                                            Adult (age verify required)
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* SillyTavern V2 fields */}
                            <div className="grid gap-4 xl:grid-cols-2">
                                <Field label="Name" value={draft.name} rows={1} onChange={(value) => updateDraft("name", value)} />
                                <Field label="Tagline / Description" value={draft.tagline} rows={1} onChange={(value) => updateDraft("tagline", value)} />
                                <Field label="Role" value={draft.role} rows={2} onChange={(value) => updateDraft("role", value)} />
                                <Field label="Speaking Style" value={draft.speakingStyle} rows={2} onChange={(value) => updateDraft("speakingStyle", value)} />
                                <Field label="Personality" value={draft.personality} rows={5} onChange={(value) => updateDraft("personality", value)} />
                                <Field label="Appearance" value={draft.appearance} rows={5} onChange={(value) => updateDraft("appearance", value)} />
                                <Field label="Backstory" value={draft.backstory} rows={6} onChange={(value) => updateDraft("backstory", value)} />
                                <Field label="Goals" value={draft.goals} rows={6} onChange={(value) => updateDraft("goals", value)} />
                                <Field label="Scenario" value={draft.scenario} rows={4} onChange={(value) => updateDraft("scenario", value)} />
                                <Field label="First Message" value={draft.firstMessage} rows={4} onChange={(value) => updateDraft("firstMessage", value)} />
                                <Field label="Example Dialogue" value={draft.exampleDialogue} rows={5} onChange={(value) => updateDraft("exampleDialogue", value)} />
                                <Field label="System Prompt" value={draft.systemPrompt} rows={5} onChange={(value) => updateDraft("systemPrompt", value)} />
                                <Field
                                    label="Post History Instructions"
                                    value={draft.postHistoryInstructions}
                                    rows={4}
                                    onChange={(value) => updateDraft("postHistoryInstructions", value)}
                                />
                                <Field label="Creator Notes" value={draft.creatorNotes} rows={4} onChange={(value) => updateDraft("creatorNotes", value)} />
                            </div>

                            {/* Personality Sliders */}
                            <div className="mt-6 rounded-lg border border-cyan-950/50 bg-blue-950/30 p-4">
                                <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-100/80">
                                    Personality Sliders
                                </div>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <SliderField label="Jealousy" value={draft.sliders.jealousy} onChange={(v) => updateSlider("jealousy", v)} />
                                    <SliderField label="Dominance Style" value={draft.sliders.dominance} onChange={(v) => updateSlider("dominance", v)} />
                                    <SliderField label="Affection Style" value={draft.sliders.affection} onChange={(v) => updateSlider("affection", v)} />
                                    <SliderField label="Empathy" value={draft.sliders.empathy} onChange={(v) => updateSlider("empathy", v)} />
                                </div>
                            </div>

                            <div className="mt-4 rounded-lg border border-cyan-950/50 bg-blue-950/40 p-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                    {builderTab === "Lorebook" ? <BookOpen className="h-4 w-4" /> : null}
                                    {builderTab === "Memory" ? <Brain className="h-4 w-4" /> : null}
                                    {builderTab === "Personas" ? <Sparkles className="h-4 w-4" /> : null}
                                    {builderTab === "Data" ? <Database className="h-4 w-4" /> : null}
                                    {builderTab === "Scenario Wizard" ? <Workflow className="h-4 w-4" /> : null}
                                    {builderTab}
                                </div>
                                <p className="mt-1 text-xs leading-5 text-cyan-100/75">
                                    This area is ready for the selected creation tool to load its focused builder.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
