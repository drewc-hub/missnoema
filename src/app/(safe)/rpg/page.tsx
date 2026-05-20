"use client";
import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    Wand2,
    RotateCcw,
    Download,
    Dice6,
    Sparkles,
    Shield,
    ScrollText,
    UserRound,
} from "lucide-react";

const races = [
    "Human",
    "Elf",
    "Dwarf",
    "Halfling",
    "Tiefling",
    "Dragonborn",
    "Orc",
    "Gnome",
    "Aasimar",
    "Goblin",
];

const classes = [
    "Fighter",
    "Wizard",
    "Rogue",
    "Cleric",
    "Ranger",
    "Bard",
    "Paladin",
    "Warlock",
    "Druid",
    "Monk",
];

const alignments = [
    "Lawful Good",
    "Neutral Good",
    "Chaotic Good",
    "Lawful Neutral",
    "True Neutral",
    "Chaotic Neutral",
    "Lawful Evil",
    "Neutral Evil",
    "Chaotic Evil",
];

const names = [
    "Aelric Thornvale",
    "Mira Vexwood",
    "Borin Ironwake",
    "Nyx Emberveil",
    "Kael Duskrunner",
    "Seraphina Moonsong",
    "Rook Blackbriar",
    "Thalia Stormglass",
    "Garruk Ashmantle",
    "Liora Dawnmere",
];

const personalities = [
    "A silver-tongued schemer who hides deep loyalty behind jokes and half-truths.",
    "A quiet wanderer with a habit of noticing everything and trusting almost no one.",
    "A reckless idealist who charges toward danger before thinking through the cost.",
    "A gloomy scholar obsessed with curses, ruins, and impossible prophecies.",
    "A warm-hearted troublemaker who collects debts, secrets, and stray animals.",
    "A proud warrior who treats every promise like a sacred oath.",
];

const backstories = [
    "They were raised near the borderlands, where old ruins whisper at night and maps cannot be trusted.",
    "They once served a powerful noble house, until a betrayal forced them into exile.",
    "They survived a monster attack that left them with a mysterious mark and unanswered questions.",
    "They stole a forbidden relic and have been hunted by its former owners ever since.",
    "They grew up among performers, spies, and smugglers, learning that every story has a price.",
    "They are the last known heir of a forgotten order sworn to guard an ancient secret.",
];

const greetings = [
    "You look like someone who needs either a blade, a map, or a miracle. Lucky for you, I know where to find all three.",
    "Keep your voice low. The walls here remember more than they should.",
    "I was wondering when fate would drag someone interesting through that door.",
    "Before you ask, no, I am not cursed. Probably.",
    "Trust me for one job, and I may trust you with the truth.",
];

const scenarios = [
    "The party meets them in a candlelit tavern while a storm traps everyone inside.",
    "They appear at the edge of a battlefield, carrying a message sealed in black wax.",
    "They are found negotiating with a ghost inside an abandoned watchtower.",
    "They hire the party to recover a stolen relic from a city beneath the city.",
    "They save the party from an ambush, then demand help with a far stranger problem.",
];

const traitPool = [
    "Keeps a hidden dagger in every outfit",
    "Talks to ravens as if they answer",
    "Cannot resist a locked door",
    "Always repays favors",
    "Afraid of deep water",
    "Collects old coins",
    "Never removes their gloves",
    "Laughs when nervous",
    "Has prophetic dreams",
    "Speaks in battlefield metaphors",
];

const emptyCharacter = {
    name: "Aelric Thornvale",
    race: "Human",
    className: "Rogue",
    alignment: "Chaotic Neutral",
    personality:
        "A silver-tongued schemer who hides deep loyalty behind jokes and half-truths.",
    backstory:
        "They were raised near the borderlands, where old ruins whisper at night and maps cannot be trusted.",
    greeting:
        "You look like someone who needs either a blade, a map, or a miracle. Lucky for you, I know where to find all three.",
    scenario:
        "The party meets them in a candlelit tavern while a storm traps everyone inside.",
    traits: ["Cannot resist a locked door", "Always repays favors", "Laughs when nervous"],
    stats: {
        str: 10,
        dex: 16,
        con: 12,
        int: 14,
        wis: 11,
        cha: 15,
    },
};

function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
}

function randomStat() {
    return Math.floor(Math.random() * 11) + 8;
}

function randomTraits() {
    const shuffled = [...traitPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
}

function createRandomCharacter() {
    return {
        name: randomItem(names),
        race: randomItem(races),
        className: randomItem(classes),
        alignment: randomItem(alignments),
        personality: randomItem(personalities),
        backstory: randomItem(backstories),
        greeting: randomItem(greetings),
        scenario: randomItem(scenarios),
        traits: randomTraits(),
        stats: {
            str: randomStat(),
            dex: randomStat(),
            con: randomStat(),
            int: randomStat(),
            wis: randomStat(),
            cha: randomStat(),
        },
    };
}

function Field({ label, value, onChange, textarea = false, children }) {
    return (
        <label className="block space-y-2">
            <span className="text-sm font-semibold text-zinc-300">{label}</span>
            {children ||
                (textarea ? (
                    <textarea
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                    />
                ) : (
                    <input
                        value={value}
                        onChange={(event) => onChange(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                    />
                ))}
        </label>
    );
}

function SelectField({ label, value, onChange, options }) {
    return (
        <Field label={label}>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </Field>
    );
}

function StatInput({ label, value, onChange }) {
    return (
        <label className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3">
            <span className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                {label}
            </span>
            <input
                type="number"
                min="1"
                max="30"
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className="mt-2 w-full bg-transparent text-2xl font-black text-zinc-100 outline-none"
            />
        </label>
    );
}

function Button({ children, onClick, variant = "primary" }) {
    const styles =
        variant === "primary"
            ? "bg-violet-500 text-white hover:bg-violet-400"
            : "border border-zinc-700 bg-zinc-950 text-zinc-200 hover:bg-zinc-900";

    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold shadow-lg shadow-black/20 transition ${styles}`}
        >
            {children}
        </button>
    );
}

export default function RpgCharacterGenerator() {
    const [character, setCharacter] = useState(emptyCharacter);

    const characterJson = useMemo(
        () => JSON.stringify(character, null, 2),
        [character]
    );

    const updateCharacter = (key, value) => {
        setCharacter((current) => ({ ...current, [key]: value }));
    };

    const updateStat = (key, value) => {
        setCharacter((current) => ({
            ...current,
            stats: {
                ...current.stats,
                [key]: value,
            },
        }));
    };

    const updateTrait = (index, value) => {
        setCharacter((current) => {
            const traits = [...current.traits];
            traits[index] = value;
            return { ...current, traits };
        });
    };

    const randomize = () => {
        setCharacter(createRandomCharacter());
    };

    const reset = () => {
        setCharacter(emptyCharacter);
    };

    const exportJson = () => {
        const blob = new Blob([characterJson], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${character.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#4c1d95,_#09090b_42%,_#020617)] px-4 py-8 text-zinc-100 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-2 text-sm font-semibold text-violet-200">
                            <Sparkles size={16} /> RPG Character Forge
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">
                            Character Generator
                        </h1>
                        <p className="mt-3 max-w-2xl text-zinc-300">
                            Build, randomize, preview, and export RPG character cards for tavern-style roleplay sessions.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <Button onClick={randomize}>
                            <Dice6 size={18} /> Randomize
                        </Button>
                        <Button onClick={reset} variant="secondary">
                            <RotateCcw size={18} /> Reset
                        </Button>
                        <Button onClick={exportJson} variant="secondary">
                            <Download size={18} /> Export JSON
                        </Button>
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <motion.div
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30 backdrop-blur"
                    >
                        <div className="mb-5 flex items-center gap-3">
                            <UserRound className="text-violet-300" />
                            <h2 className="text-xl font-black">Editor</h2>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field
                                label="Name"
                                value={character.name}
                                onChange={(value) => updateCharacter("name", value)}
                            />
                            <SelectField
                                label="Race"
                                value={character.race}
                                onChange={(value) => updateCharacter("race", value)}
                                options={races}
                            />
                            <SelectField
                                label="Class"
                                value={character.className}
                                onChange={(value) => updateCharacter("className", value)}
                                options={classes}
                            />
                            <SelectField
                                label="Alignment"
                                value={character.alignment}
                                onChange={(value) => updateCharacter("alignment", value)}
                                options={alignments}
                            />
                        </div>

                        <div className="mt-5 grid gap-4">
                            <Field
                                label="Personality"
                                value={character.personality}
                                onChange={(value) => updateCharacter("personality", value)}
                                textarea
                            />
                            <Field
                                label="Backstory"
                                value={character.backstory}
                                onChange={(value) => updateCharacter("backstory", value)}
                                textarea
                            />
                            <Field
                                label="Greeting / First Message"
                                value={character.greeting}
                                onChange={(value) => updateCharacter("greeting", value)}
                                textarea
                            />
                            <Field
                                label="Scenario"
                                value={character.scenario}
                                onChange={(value) => updateCharacter("scenario", value)}
                                textarea
                            />
                        </div>

                        <div className="mt-5">
                            <h3 className="mb-3 text-sm font-semibold text-zinc-300">Traits</h3>
                            <div className="grid gap-3 sm:grid-cols-3">
                                {character.traits.map((trait, index) => (
                                    <input
                                        key={index}
                                        value={trait}
                                        onChange={(event) => updateTrait(index, event.target.value)}
                                        className="rounded-2xl border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-100 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="mt-5">
                            <h3 className="mb-3 text-sm font-semibold text-zinc-300">Stats</h3>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                                {Object.entries(character.stats).map(([key, value]) => (
                                    <StatInput
                                        key={key}
                                        label={key}
                                        value={value}
                                        onChange={(nextValue) => updateStat(key, nextValue)}
                                    />
                                ))}
                            </div>
                        </div>
                    </motion.div>

                    <div className="space-y-6">
                        <motion.article
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.08 }}
                            className="overflow-hidden rounded-[2rem] border border-violet-400/20 bg-zinc-950 shadow-2xl shadow-black/40"
                        >
                            <div className="border-b border-zinc-800 bg-gradient-to-br from-violet-500/30 via-fuchsia-500/10 to-zinc-950 p-6">
                                <div className="mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/10 bg-black/30 text-5xl shadow-xl">
                                    🧙
                                </div>
                                <h2 className="text-3xl font-black text-white">{character.name}</h2>
                                <p className="mt-2 text-zinc-300">
                                    {character.race} {character.className} · {character.alignment}
                                </p>
                            </div>

                            <div className="space-y-5 p-6">
                                <section>
                                    <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-300">
                                        <Wand2 size={16} /> Personality
                                    </div>
                                    <p className="text-sm leading-6 text-zinc-300">{character.personality}</p>
                                </section>

                                <section>
                                    <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-300">
                                        <ScrollText size={16} /> Backstory
                                    </div>
                                    <p className="text-sm leading-6 text-zinc-300">{character.backstory}</p>
                                </section>

                                <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                                    <div className="mb-2 text-sm font-bold uppercase tracking-wider text-violet-300">
                                        First Message
                                    </div>
                                    <p className="text-sm italic leading-6 text-zinc-200">“{character.greeting}”</p>
                                </section>

                                <section>
                                    <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-violet-300">
                                        <Shield size={16} /> Traits
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {character.traits.map((trait) => (
                                            <span
                                                key={trait}
                                                className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs font-semibold text-violet-100"
                                            >
                                                {trait}
                                            </span>
                                        ))}
                                    </div>
                                </section>

                                <section className="grid grid-cols-3 gap-3">
                                    {Object.entries(character.stats).map(([key, value]) => (
                                        <div
                                            key={key}
                                            className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 text-center"
                                        >
                                            <div className="text-xs font-black uppercase tracking-widest text-zinc-500">
                                                {key}
                                            </div>
                                            <div className="mt-1 text-2xl font-black text-white">{value}</div>
                                        </div>
                                    ))}
                                </section>
                            </div>
                        </motion.article>

                        <motion.div
                            initial={{ opacity: 0, y: 18 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.14 }}
                            className="rounded-[2rem] border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl shadow-black/30"
                        >
                            <h3 className="mb-3 text-lg font-black">Export Preview</h3>
                            <pre className="max-h-72 overflow-auto rounded-2xl border border-zinc-800 bg-black/50 p-4 text-xs leading-5 text-zinc-300">
                                {characterJson}
                            </pre>
                        </motion.div>
                    </div>
                </section>
            </div>
        </main>
    );
}
