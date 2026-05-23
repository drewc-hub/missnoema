
// components/rp/StarterPrompts.tsx
'use client';

type StarterPromptsProps = {
    prompts: string[];
    onApplyPrompt: (prompt: string) => void;
};

export function StarterPrompts({ prompts, onApplyPrompt }: StarterPromptsProps) {
    return (
        <section className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 shadow-xl">
            <h2 className="text-xl font-semibold">Starter Prompts</h2>
            <div className="mt-4 grid gap-2">
                {prompts.map((prompt) => (
                    <button
                        key={prompt}
                        onClick={() => onApplyPrompt(prompt)}
                        className="rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-3 text-left text-sm text-zinc-200 hover:border-pink-400"
                    >
                        {prompt}
                    </button>
                ))}
            </div>
        </section>
    );
}
