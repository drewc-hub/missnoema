"use client";

import { useCharacterCreate } from "../hooks/useCharacterCreate";
import PersonalitySliders from "./PersonalitySliders";
import SpiceMeter from "./SpiceMeter";

export default function CharacterForm() {
  const { character, updateField, updatePersonality, saveCharacter } =
    useCharacterCreate();

  return (
    <div className="character-form">
      <h2>Create Your Companion</h2>

      <input
        placeholder="Name"
        value={character.name}
        onChange={(e) => updateField("name", e.target.value)}
      />

      <textarea
        placeholder="Description / Backstory (adult, fictional only)"
        value={character.description}
        onChange={(e) => updateField("description", e.target.value)}
      />

      <label>
        <input
          type="checkbox"
          checked={character.is_fantasy}
          onChange={(e) => updateField("is_fantasy", e.target.checked)}
        />
        Fantasy Character
      </label>

      <SpiceMeter
        value={character.spice_level}
        onChange={(v) => updateField("spice_level", v)}
      />

      <PersonalitySliders
        values={character.personality}
        onChange={updatePersonality}
      />

      <button onClick={saveCharacter}>Create Character</button>
    </div>
  );
}
