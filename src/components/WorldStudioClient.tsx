"use client";

import { useMemo, useState } from "react";
import {
    BookOpen,
    Brain,
    Database,
    Feather,
    PenLine,
    Save,
    ScrollText,
    Sparkles,
    Wand2,
    Workflow,
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
    };
};

type WorldStudioClientProps = {
    worlds: StudioWorld[];
    companions: StudioCompanion[];
};

const workspaceTabs = ["New World", "New Story", "New Scene"] as const;
const rosterTabs = ["New", "Generate"] as const;
const builderTabs = ["Lorebook", "Memory", "Personas", "Data", "Scenario Wizard"] as const;
const characterActions = [
    { label: "Generate", icon: Wand2 },
    { label: "Rewrite", icon: PenLine },
    { label: "Expand", icon: Feather },
    { label: "Shorten", icon: ScrollText },
    { label: "Save", icon: Save },
] as const;

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
    };
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

export function WorldStudioClient({ worlds, companions }: WorldStudioClientProps) {
    const [workspaceTab, setWorkspaceTab] = useState<(typeof workspaceTabs)[number]>("New World");
    const [rosterTab, setRosterTab] = useState<(typeof rosterTabs)[number]>("New");
    const [builderTab, setBuilderTab] = useState<(typeof builderTabs)[number]>("Lorebook");
    const [selectedWorldId, setSelectedWorldId] = useState(worlds[0]?.id ?? "");
    const [selectedCompanionId, setSelectedCompanionId] = useState(companions[0]?.id ?? "");
    const [characterSeed, setCharacterSeed] = useState("");
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

    return (
        <div className="min-h-[calc(100vh-140px)] rounded-lg border border-cyan-900/40 bg-[linear-gradient(360deg,#17023e_50%,#0f2b7d_83%,#0b1d82_100%)] p-3 text-zinc-100 shadow-2xl shadow-blue-950/40 sm:p-4">
            <div className="grid min-h-[calc(100vh-172px)] gap-4 2xl:grid-cols-[minmax(430px,0.9fr)_minmax(720px,1.35fr)]">
                <section className="rounded-lg border border-cyan-900/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4 2xl:col-span-2">
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

                <section className="flex min-h-0 flex-col rounded-lg border border-cyan-900/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4">
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

                <section className="flex min-h-0 flex-col rounded-lg border border-cyan-900/50 bg-[linear-gradient(45deg,#00457c_0%,#0079c1_100%)] p-4">
                    <header className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-lg font-semibold text-white">Character</div>
                            <div className="text-xs text-cyan-100/70">
                                {selectedCompanion ? `Editing ${selectedCompanion.name}` : "Create a SillyTavern V2-style card"}
                            </div>
                        </div>
                        {selectedCompanion ? (
                            <a
                                href={selectedCompanion.editHref}
                                className="inline-flex h-9 items-center justify-center rounded-lg border border-cyan-200/40 bg-zinc-950/70 px-3 text-sm font-semibold text-white hover:bg-zinc-900"
                            >
                                Open Edit
                            </a>
                        ) : null}
                    </header>

                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {characterActions.map(({ label, icon: Icon }) => (
                            <TabButton key={label} className="h-10 gap-1.5 px-2 text-xs">
                                <Icon className="h-3.5 w-3.5" />
                                {label}
                            </TabButton>
                        ))}
                    </div>

                    <div className="mt-4 min-h-0 flex-1 overflow-y-auto rounded-lg border border-cyan-950/50 bg-zinc-950/55 p-4">
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
    );
}
