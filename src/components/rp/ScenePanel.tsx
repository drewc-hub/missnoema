
// components/rp/ScenePanel.tsx
'use client';

type ScenePanelProps = {
  scene: string;
  onChange: (value: string) => void;
  onRandomize: () => void;
  onPushToChat: () => void;
};

export function ScenePanel({
  scene,
  onChange,
  onRandomize,
  onPushToChat,
}: ScenePanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl">
      <h2 className="text-xl font-semibold">Scene Generator</h2>
      <p className="mt-1 text-sm text-zinc-400">Set the RP tone fast.</p>

      <textarea
        value={scene}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-sm outline-none focus:border-pink-400"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onRandomize}
          className="rounded-2xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Random Scene
        </button>
        <button
          onClick={onPushToChat}
          className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
        >
          Push Scene To Chat
        </button>
      </div>
    </section>
  );
}
