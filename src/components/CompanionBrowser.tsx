"use client";

import { useState } from "react";

type Companion = {
  id: string;
  name: string;
  tags: string[];
  isAdultOnly?: boolean;
};

export default function CompanionBrowser({ characters }: { characters: Companion[] }) {
  const [query, setQuery] = useState("");
  const [showAdult, setShowAdult] = useState(false);

  const filtered = characters.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      c.tags.some((tag) => tag.toLowerCase().includes(query.toLowerCase()));
    const matchesAdult = showAdult ? c.isAdultOnly : true;
    return matchesSearch && matchesAdult;
  });

  return (
    <div className="space-y-4">
      <input
        placeholder="Search companions..."
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
        onChange={(e) => setQuery(e.target.value)}
      />
      <label className="flex items-center gap-2 text-sm text-zinc-400">
        <input type="checkbox" checked={showAdult} onChange={(e) => setShowAdult(e.target.checked)} />
        Show adult only
      </label>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="font-semibold text-zinc-100">{c.name}</div>
            <div className="mt-1 flex flex-wrap gap-1">
              {c.tags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">{t}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
