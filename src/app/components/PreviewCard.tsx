"use client";

import { useCharacterCreate } from "../hooks/useCharacterCreate";

export default function PreviewCard() {
  const { character } = useCharacterCreate();

  return (
    <div className="preview-card">
      <h3>{character.name || "Preview"}</h3>
      <p>{character.description || "Your companion’s personality preview"}</p>
      <p>{character.is_fantasy ? "Fantasy Being" : "Human Companion"}</p>
      <p>Spice: {character.spice_level}/100</p>
    </div>
  );
}
