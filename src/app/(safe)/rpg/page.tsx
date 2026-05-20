// app/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { CharacterForm } from '@/components/rp/CharacterForm';
import { ChatPanel } from '@/components/rp/ChatPanel';
import { QuickCharacterCard } from '@/components/rp/QuickCharacterCard';
import { ScenePanel } from '@/components/rp/ScenePanel';
import { StarterPrompts } from '@/components/rp/StarterPrompts';
import type { CharacterProfile, ChatMessage } from '@/lib/rp-types';
import { SCENARIOS } from '@/lib/rp-data';
import {
    createId,
    createRandomCharacter,
    randomOf,
    serializeCharacterProfile,
} from '@/lib/rp-utils';

export default function Page() {
    const [character, setCharacter] = useState<CharacterProfile>(() => createRandomCharacter());
    const [scene, setScene] = useState<string>(() => randomOf(SCENARIOS));
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>(() => {
        const initialCharacter = createRandomCharacter();
        return [
            {
                id: createId(),
                role: 'system',
                content: 'RP session initialized.',
            },
            {
                id: createId(),
                role: 'character',
                content: initialCharacter.openingLine,
            },
        ];
    });

    const starterPrompts = useMemo(
        () => [
            `Start the RP with ${character.name} in this scenario: ${scene}`,
            `Write ${character.name}'s first reaction when they see me.`,
            `Generate a dramatic confession scene for ${character.name}.`,
            `Create a slow-burn enemies-to-lovers moment with ${character.name}.`,
            `Make ${character.name} reveal their secret in-character.`,
        ],
        [character.name, scene]
    );

    function resetConversation(nextCharacter: CharacterProfile, nextScene: string) {
        setMessages([
            {
                id: createId(),
                role: 'system',
                content: `RP session initialized. Scene: ${nextScene}`,
            },
            {
                id: createId(),
                role: 'character',
                content: nextCharacter.openingLine,
            },
        ]);
    }

    function handleGenerateAll() {
        const nextCharacter = createRandomCharacter();
        const nextScene = randomOf(SCENARIOS);
        setCharacter(nextCharacter);
        setScene(nextScene);
        resetConversation(nextCharacter, nextScene);
    }

    function handleClearChat() {
        resetConversation(character, scene);
    }

    async function handleCopyProfile() {
        try {
            await navigator.clipboard.writeText(serializeCharacterProfile(character, scene));
        } catch { }
    }

    async function handleSendMessage() {
        const trimmed = input.trim();
        if (!trimmed || isLoading) return;

        const userMessage: ChatMessage = {
            id: createId(),
            role: 'user',
            content: trimmed,
        };

        const nextMessages = [...messages, userMessage];
        setMessages(nextMessages);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/rp-chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    character,
                    scene,
                    messages: nextMessages,
                }),
            });

            const data = (await response.json()) as { reply?: string; error?: string };

            if (!response.ok || !data.reply) {
                throw new Error(data.error || 'Failed to generate reply.');
            }

            const characterReply: ChatMessage = {
                id: createId(),
                role: 'character',
                content: data.reply,
            };

            setMessages((prev) => [...prev, characterReply]);
        } catch (error) {
            const fallback: ChatMessage = {
                id: createId(),
                role: 'system',
                content:
                    error instanceof Error ? `Error: ${error.message}` : 'Error: Failed to generate reply.',
            };
            setMessages((prev) => [...prev, fallback]);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100">
            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
                <header className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-2xl">
                    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                        <div>
                            <p className="text-sm uppercase tracking-[0.3em] text-pink-300">RP Studio</p>
                            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
                                AI Chat RP Character Creator
                            </h1>
                            <p className="mt-2 max-w-3xl text-sm text-zinc-400 md:text-base">
                                Create a character, generate traits, set a scene, and roleplay with AI.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={handleGenerateAll}
                                className="rounded-2xl bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                Generate All
                            </button>
                            <button
                                onClick={() => setScene(randomOf(SCENARIOS))}
                                className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-700"
                            >
                                New Scene
                            </button>
                            <button
                                onClick={handleCopyProfile}
                                className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-700"
                            >
                                Copy Profile
                            </button>
                        </div>
                    </div>
                </header>

                <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                    <CharacterForm
                        character={character}
                        onChange={setCharacter}
                        onGenerateAll={handleGenerateAll}
                    />

                    <div className="flex flex-col gap-6">
                        <ScenePanel
                            scene={scene}
                            onChange={setScene}
                            onRandomize={() => setScene(randomOf(SCENARIOS))}
                            onPushToChat={() =>
                                setMessages((prev) => [
                                    ...prev,
                                    {
                                        id: createId(),
                                        role: 'system',
                                        content: `Scene updated: ${scene}`,
                                    },
                                ])
                            }
                        />

                        <StarterPrompts prompts={starterPrompts} onApplyPrompt={setInput} />

                        <QuickCharacterCard character={character} />
                    </div>
                </section>

                <ChatPanel
                    characterName={character.name}
                    input={input}
                    isLoading={isLoading}
                    messages={messages}
                    onChangeInput={setInput}
                    onClearChat={handleClearChat}
                    onSendMessage={handleSendMessage}
                    onUseOpeningLine={() => setInput(character.openingLine)}
                />
            </div>
        </main>
    );
}
