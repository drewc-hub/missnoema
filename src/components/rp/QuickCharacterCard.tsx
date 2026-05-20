
// components/rp/QuickCharacterCard.tsx
'use client';

import type { CharacterProfile } from '@/lib/rp-types';

type QuickCharacterCardProps = {
  character: CharacterProfile;
};

export function QuickCharacterCard({ character }: QuickCharacterCardProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
      <h2 className="text-xl font-semibold">Quick Character Card</h2>

      <div className="mt-4 rounded-3xl border border-pink-500/20 bg-gradient-to-br from-pink-500/10 to-indigo-500/10 p-4">
        <h3 className="text-2xl font-bold">{character.name}</h3>
        <p className="text-sm text-pink-300">{character.title}</p>
        <p className="mt-3 text-sm text-zinc-300">
          <span className="font-semibold text-white">Archetype:</span> {character.archetype}
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          <span className="font-semibold text-white">Origin:</span> {character.origin}
        </p>
        <p className="mt-1 text-sm text-zinc-300">
          <span className="font-semibold text-white">Goal:</span> {character.goal}
        </p>
        <p className="mt-3 rounded-2xl border border-zinc-700 bg-zinc-950/60 p-3 text-sm italic text-zinc-200">
          “{character.openingLine}”
        </p>
      </div>
    </section>
  );
}
