"use client";

import React, { useState } from "react";
import type { CharacterBookEntry } from "@/lib/companion-profile";

type Props = {
  entries: CharacterBookEntry[];
  onChange: (entries: CharacterBookEntry[]) => void;
};

function newEntry(index: number): CharacterBookEntry {
  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name: `Entry ${index + 1}`,
    comment: "",
    keys: [],
    content: "",
    enabled: true,
    constant: false,
    insertion_order: index,
  };
}

function tokenEstimate(content: string) {
  return Math.ceil(content.length / 4);
}

type EntryCardProps = {
  entry: CharacterBookEntry;
  onChange: (updated: CharacterBookEntry) => void;
  onDelete: () => void;
};

function EntryCard({ entry, onChange, onDelete }: EntryCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [keysInput, setKeysInput] = useState(entry.keys.join(", "));

  function handleKeysBlur() {
    const parsed = keysInput
      .split(",")
      .map(k => k.trim())
      .filter(Boolean);
    onChange({ ...entry, keys: parsed });
  }

  function handleKeysChange(value: string) {
    setKeysInput(value);
  }

  const parsedKeys = keysInput
    .split(",")
    .map(k => k.trim())
    .filter(Boolean);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60">
      <div className="flex items-center gap-2 p-3">
        <input
          type="checkbox"
          checked={entry.enabled}
          onChange={e => onChange({ ...entry, enabled: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-700 accent-fuchsia-500 flex-none"
          title="Enabled"
        />
        <input
          type="text"
          value={entry.name}
          onChange={e => onChange({ ...entry, name: e.target.value })}
          placeholder="Entry name…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-200 placeholder-zinc-600 focus:border-fuchsia-500/50 focus:outline-none"
        />
        {entry.constant && (
          <span className="flex-none rounded-full border border-fuchsia-700/50 bg-fuchsia-950/40 px-2 py-0.5 text-[10px] font-medium text-fuchsia-300">
            constant
          </span>
        )}
        <span className="flex-none text-[11px] text-zinc-500">
          ~{tokenEstimate(entry.content)} tok
        </span>
        <button
          type="button"
          onClick={() => setExpanded(x => !x)}
          className="flex-none rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-200"
          title={expanded ? "Collapse" : "Expand"}
          aria-label={expanded ? "Collapse entry" : "Expand entry"}
        >
          <svg
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 10 6"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M1 1l4 4 4-4" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex-none rounded-lg border border-zinc-800 bg-zinc-950 p-1 text-zinc-500 transition hover:border-red-800/50 hover:text-red-400"
          title="Delete entry"
          aria-label="Delete entry"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2 2l10 10M12 2L2 12" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="border-t border-zinc-800 p-3 space-y-3">
          <div className="space-y-1">
            <div className="text-[11px] text-zinc-500">Keywords (comma-separated)</div>
            <input
              type="text"
              value={keysInput}
              onChange={e => handleKeysChange(e.target.value)}
              onBlur={handleKeysBlur}
              placeholder="keyword1, keyword2…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-fuchsia-500/50 focus:outline-none"
            />
            {parsedKeys.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {parsedKeys.map((k, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <div className="text-[11px] text-zinc-500">Content</div>
            <textarea
              rows={4}
              value={entry.content}
              onChange={e => onChange({ ...entry, content: e.target.value })}
              placeholder="Context injected when keywords appear in conversation…"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 placeholder-zinc-600 focus:border-fuchsia-500/50 focus:outline-none resize-y"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={entry.constant}
                onChange={e => onChange({ ...entry, constant: e.target.checked })}
                className="h-4 w-4 rounded border-zinc-700 accent-fuchsia-500"
              />
              Always inject (constant)
            </label>

            <label className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="text-[11px] text-zinc-500">Order</span>
              <input
                type="number"
                min={0}
                value={entry.insertion_order}
                onChange={e => onChange({ ...entry, insertion_order: Math.max(0, Number(e.target.value)) })}
                className="w-16 rounded-lg border border-zinc-800 bg-zinc-950 px-2 py-1 text-sm text-zinc-200 focus:border-fuchsia-500/50 focus:outline-none"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

export function LorebookEditor({ entries, onChange }: Props) {
  function addEntry() {
    onChange([...entries, newEntry(entries.length)]);
  }

  function updateEntry(index: number, updated: CharacterBookEntry) {
    const next = entries.slice();
    next[index] = updated;
    onChange(next);
  }

  function deleteEntry(index: number) {
    onChange(entries.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-zinc-100">Lorebook</span>
        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] text-zinc-400">
          {entries.length} {entries.length === 1 ? "entry" : "entries"}
        </span>
        <button
          type="button"
          onClick={addEntry}
          className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/40 bg-fuchsia-600/10 px-3 py-1.5 text-xs font-medium text-fuchsia-300 transition hover:bg-fuchsia-600/20 hover:border-fuchsia-500/60"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v10M2 7h10" />
          </svg>
          Add entry
        </button>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40 p-6 text-center text-sm text-zinc-500">
          No lorebook entries. Add one to inject context based on keywords in the conversation.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <EntryCard
              key={entry.id || i}
              entry={entry}
              onChange={updated => updateEntry(i, updated)}
              onDelete={() => deleteEntry(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default LorebookEditor;
