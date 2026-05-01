import Link from "next/link";

export default function CompanionCard({ character }) {
  return (
    <Link
      href={`/chat?character=${character.id}`}
      className="bg-neutral-900 rounded-2xl overflow-hidden hover:bg-neutral-800 transition"
    >
      <div className="h-48 bg-neutral-800 relative">
        {character.photos?.[0] ? (
          <img
            src={character.photos[0].imageUrl}
            className="object-cover w-full h-full"
            alt={character.name}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <span className="text-xl">{character.name}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="font-medium">{character.name}</div>
        <div className="text-sm opacity-70 mt-1">{character.description}</div>
      </div>
    </Link>
  );
}
