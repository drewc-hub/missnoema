
// components/rp/CharacterForm.tsx
'use client';

import type { CharacterProfile } from '@/lib/rp-types';
import { FIELD_DEFINITIONS } from '@/lib/rp-data';
import { createRandomCharacterFieldValue } from '@/lib/rp-utils';

type CharacterFormProps = {
  character: CharacterProfile;
  onChange: React.Dispatch<React.SetStateAction<CharacterProfile>>;
  onGenerateAll: () => void;
};

export function CharacterForm({
  character,
  onChange,
  onGenerateAll,
}: CharacterFormProps) {
  function updateField<K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) {
    onChange((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Character Creator</h2>
          <p className="text-sm text-zinc-400">Edit fields or randomize them.</p>
        </div>
        <button
          onClick={onGenerateAll}
          className="rounded-2xl border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm font-medium hover:bg-zinc-700"
        >
          Randomize Character
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {FIELD_DEFINITIONS.map(({ key, label, multiline }) => (
          <div key={key} className={multiline ? 'md:col-span-2' : ''}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-zinc-300">{label}</label>
              <button
                onClick={() => updateField(key, createRandomCharacterFieldValue(key))}
                className="rounded-xl border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
              >
                Generate
              </button>
            </div>

            {multiline ? (
              <textarea
                value={character[key]}
                onChange={(e) => updateField(key, e.target.value)}
                rows={3}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-pink-400"
              />
            ) : (
              <input
                value={character[key]}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm outline-none placeholder:text-zinc-500 focus:border-pink-400"
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

