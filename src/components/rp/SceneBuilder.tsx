
// components/rp/SceneBuilder.tsx
'use client';

import { useState } from 'react';
import { SCENARIOS } from '@/lib/rp-data';

type Props = {
    scene: string;
    onChange: (value: string) => void;
    onRandomize: () => void;
    onPushToChat: () => void;
};

const LOCATIONS = [
    'A ruined chapel',
    'A moonlit forest',
    'A royal ballroom',
    'A rainy city alley',
    'An underground tavern',
    'A crumbling tower',
    'A crowded market',
    'A storm-swept lighthouse',
    'A desert oasis',
    'A celestial observatory',
    'A frozen dungeon',
    'A sunlit garden',
];

const TIMES = [
    'At dawn',
    'In the morning',
    'At midday',
    'At dusk',
    'At night',
    'At midnight',
];

const MOODS = [
    'Tense',
    'Romantic',
    'Mysterious',
    'Comedic',
    'Dark',
    'Hopeful',
    'Melancholic',
    'Dangerous',
];

const WEATHERS = [
    'Clear skies',
    'A raging storm',
    'Heavy rain',
    'Light snow',
    'Dense fog',
    'Blazing heat',
    'A gentle breeze',
];

type Tab = 'build' | 'presets';

export function SceneBuilder({ scene, onChange, onRandomize, onPushToChat }: Props) {
    const [tab, setTab] = useState<Tab>('build');
    const [location, setLocation] = useState('');
    const [time, setTime] = useState('');
    const [mood, setMood] = useState('');
    const [weather, setWeather] = useState('');
    const [notes, setNotes] = useState('');

    function handleCompose() {
        const parts: string[] = [];
        if (time && location) parts.push(`${time}, ${location.toLowerCase()}.`);
        else if (location) parts.push(`${location}.`);
        else if (time) parts.push(`${time}.`);
        if (mood) parts.push(`The atmosphere is ${mood.toLowerCase()}.`);
        if (weather) parts.push(`${weather}.`);
        if (notes.trim()) parts.push(notes.trim());
        if (parts.length > 0) onChange(parts.join(' '));
    }

    function ChipGroup({
        options,
        selected,
        onSelect,
    }: {
        options: string[];
        selected: string;
        onSelect: (v: string) => void;
    }) {
        return (
            <div className="flex flex-wrap gap-1.5">
                {options.map((opt) => (
                    <button
                        key={opt}
                        type="button"
                        onClick={() => onSelect(selected === opt ? '' : opt)}
                        className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                            selected === opt
                                ? 'bg-pink-500 text-white'
                                : 'border border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-pink-500/50 hover:text-white'
                        }`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <section className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-xl font-semibold">Scene Builder</h2>
            <p className="mt-1 text-sm text-zinc-400">Compose a scene or pick a preset.</p>

            {/* Tabs */}
            <div className="mt-4 flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900 p-1">
                {(['build', 'presets'] as Tab[]).map((t) => (
                    <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition ${
                            tab === t
                                ? 'bg-zinc-700 text-white'
                                : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        {t === 'build' ? 'Build Scene' : 'Quick Presets'}
                    </button>
                ))}
            </div>

            {tab === 'build' && (
                <div className="mt-4 space-y-4">
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Location</p>
                        <ChipGroup options={LOCATIONS} selected={location} onSelect={setLocation} />
                    </div>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Time of Day</p>
                        <ChipGroup options={TIMES} selected={time} onSelect={setTime} />
                    </div>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Mood</p>
                        <ChipGroup options={MOODS} selected={mood} onSelect={setMood} />
                    </div>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Weather</p>
                        <ChipGroup options={WEATHERS} selected={weather} onSelect={setWeather} />
                    </div>
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">Additional notes</p>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add context, stakes, or details…"
                            rows={2}
                            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-pink-400 placeholder:text-zinc-600"
                        />
                    </div>
                    <button
                        onClick={handleCompose}
                        disabled={!location && !time && !mood && !weather && !notes.trim()}
                        className="w-full rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-30"
                    >
                        Compose Scene
                    </button>
                </div>
            )}

            {tab === 'presets' && (
                <div className="mt-4 grid gap-2">
                    {SCENARIOS.map((s) => (
                        <button
                            key={s}
                            onClick={() => onChange(s)}
                            className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                                scene === s
                                    ? 'border-pink-500/60 bg-pink-500/10 text-pink-200'
                                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-pink-500/40 hover:text-white'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Composed scene preview + edit */}
            <div className="mt-5">
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">Current scene</p>
                <textarea
                    value={scene}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-pink-400"
                />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
                <button
                    onClick={onRandomize}
                    className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                    Random Scene
                </button>
                <button
                    onClick={onPushToChat}
                    className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
                >
                    Push to Chat
                </button>
            </div>
        </section>
    );
}
