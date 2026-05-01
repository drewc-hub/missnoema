export default function CharacterCard({ character }) {
  return (
    <div className="character-card">
      <h3>{character.name}</h3>
      <p>{character.description.slice(0, 120)}...</p>
      <p>
        {character.is_fantasy ? "Fantasy" : "Human"} · Spice{" "}
        {character.spice_level}/100
      </p>
      <button>Add to My Companions</button>
    </div>
  );
}
