"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function WorldCreateForm() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [summary, setSummary] = useState("");
    const [setting, setSetting] = useState("");
    const [isPublic, setIsPublic] = useState(true);
    const [maxMembers, setMaxMembers] = useState(8);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function onSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setError(null);

        const res = await fetch("/api/worlds", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                name,
                summary,
                setting,
                isPublic,
                maxMembers,
            }),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            setSaving(false);
            setError(data?.error || "Failed to create world.");
            return;
        }

        router.push(`/worlds/${data.world.slug}`);
        router.refresh();
    }

    return (
        <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)] p-4">
            <div>
                <label htmlFor="world-name" className="mb-1 block text-sm font-semibold text-zinc-200">
                    World name
                </label>
                <input
                    id="world-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    minLength={3}
                    maxLength={80}
                    placeholder="Moonport Guild Hall"
                    className="h-10 w-full rounded-lg border border-zinc-800 bg-black px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
            </div>

            <div>
                <label htmlFor="world-summary" className="mb-1 block text-sm font-semibold text-zinc-200">
                    One-line premise
                </label>
                <textarea
                    id="world-summary"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    required
                    minLength={12}
                    maxLength={500}
                    rows={3}
                    placeholder="A harbor city where magical guilds negotiate peace while monster tides rise offshore."
                    className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
            </div>

            <div>
                <label htmlFor="world-setting" className="mb-1 block text-sm font-semibold text-zinc-200">
                    Scene setup (optional)
                </label>
                <textarea
                    id="world-setting"
                    value={setting}
                    onChange={(e) => setSetting(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    placeholder="Describe factions, current conflict, and the opening moment for players."
                    className="w-full rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300">
                    <span className="mb-1 block text-xs uppercase text-zinc-500">Capacity</span>
                    <input
                        type="number"
                        value={maxMembers}
                        onChange={(e) => setMaxMembers(Math.max(2, Math.min(20, Number(e.target.value) || 8)))}
                        min={2}
                        max={20}
                        className="h-8 w-full rounded-md border border-zinc-700 bg-zinc-950 px-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/30"
                    />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm text-zinc-300">
                    <input
                        type="checkbox"
                        checked={isPublic}
                        onChange={(e) => setIsPublic(e.target.checked)}
                        className="h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-fuchsia-500"
                    />
                    Public world
                </label>
            </div>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}

            <button
                type="submit"
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-fuchsia-500 px-4 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {saving ? "Creating..." : "Create world"}
            </button>
        </form>
    );
}
