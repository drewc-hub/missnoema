type Companion = {
  id: string;
  name: string;
  description?: string;
  tags: string[];
};

export default function CompanionGrid({
  companions,
  className = "",
}: {
  companions: Companion[];
  className?: string;
}) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {companions.map((c) => (
        <a
          key={c.id}
          href={`/chat?companion=${encodeURIComponent(c.id)}`}
          className="block overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-600"
        >
          <div className="font-semibold text-zinc-100">{c.name}</div>
          {c.description && (
            <div className="mt-1 line-clamp-2 text-sm text-zinc-400">{c.description}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-1">
            {c.tags.slice(0, 5).map((t) => (
              <span key={t} className="rounded-full bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">{t}</span>
            ))}
          </div>
        </a>
      ))}
    </div>
  );
}
