// app/page.tsx
'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { CharacterForm } from '@/components/rp/CharacterForm';
import { ChatPanel } from '@/components/rp/ChatPanel';
import { QuickCharacterCard } from '@/components/rp/QuickCharacterCard';
import { ScenePanel } from '@/components/rp/ScenePanel';
import { StarterPrompts } from '@/components/rp/StarterPrompts';
import { MediaGenPanel } from '@/components/MediaGenPanel';
import type { CharacterProfile, ChatMessage } from '@/lib/rp-types';
import { SCENARIOS } from '@/lib/rp-data';
import {
    createId,
    createRandomCharacter,
    randomOf,
    serializeCharacterProfile,
} from '@/lib/rp-utils';

type SessionMedia = { url: string; type: 'image' | 'video' };

export default function Page() {
    const searchParams = useSearchParams();
    const companionSlug = searchParams.get('companion');

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

    // Auth state — checked once on mount
    const [loggedIn, setLoggedIn] = useState(false);
    useEffect(() => {
        fetch('/api/me/balance')
            .then((r) => { if (r.ok) setLoggedIn(true); })
            .catch(() => {});
    }, []);

    // Pre-load companion from ?companion=slug
    useEffect(() => {
        if (!companionSlug) return;
        fetch(`/api/companions/profile?slug=${encodeURIComponent(companionSlug)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((data) => {
                if (!data) return;
                const loaded: CharacterProfile = {
                    name: data.name ?? '',
                    title: data.profile?.tagline || data.profile?.role || data.archetype || '',
                    archetype: data.archetype ?? '',
                    age: '',
                    pronouns: data.gender === 'male' ? 'he/him' : data.gender === 'non-binary' ? 'they/them' : 'she/her',
                    origin: data.profile?.background ?? '',
                    personality: data.profile?.personality ?? '',
                    appearance: data.profile?.appearance || data.profile?.wardrobe || '',
                    likes: '',
                    dislikes: '',
                    secret: '',
                    goal: data.profile?.goals ?? '',
                    openingLine: data.profile?.greeting || `Hello, I'm ${data.name}.`,
                };
                setCharacter(loaded);
                setMessages([
                    { id: createId(), role: 'system', content: `RP session initialized with ${data.name}.` },
                    { id: createId(), role: 'character', content: loaded.openingLine },
                ]);
            })
            .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [companionSlug]);

    // Media modal
    const [showMediaModal, setShowMediaModal] = useState(false);

    // Gallery side panel — collects media generated during this session
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [sessionMedia, setSessionMedia] = useState<SessionMedia[]>([]);

    const handleMediaGenerated = useCallback((url: string, type: 'image' | 'video') => {
        setSessionMedia((prev) => [{ url, type }, ...prev]);
    }, []);

    // Scroll-direction-aware tab visibility
    const [tabVisible, setTabVisible] = useState(true);
    const lastScrollY = useRef(0);
    useEffect(() => {
        function onScroll() {
            const y = window.scrollY;
            setTabVisible(y < lastScrollY.current || y < 80);
            lastScrollY.current = y;
        }
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

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
            {/* ── Media generation full-page modal ── */}
            {showMediaModal && (
                <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-zinc-950/95 backdrop-blur-sm">
                    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur-sm">
                        <h2 className="text-base font-semibold text-zinc-100">Generate Media</h2>
                        <button
                            onClick={() => setShowMediaModal(false)}
                            className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800"
                        >
                            Close
                        </button>
                    </div>
                    <div className="mx-auto w-full max-w-2xl px-4 py-6">
                        <MediaGenPanel
                            allowAdult={false}
                            loggedIn={loggedIn}
                            companionId=""
                            contentRating="SAFE"
                            onGenerated={handleMediaGenerated}
                        />
                    </div>
                </div>
            )}

            {/* ── Gallery slide-out panel ── */}
            <div
                className={`fixed right-0 top-0 z-40 flex h-full w-72 flex-col border-l border-zinc-900 bg-zinc-950 shadow-2xl transition-transform duration-300 ${galleryOpen ? 'translate-x-0' : 'translate-x-full'}`}
            >
                <div className="flex items-center justify-between border-b border-zinc-900 px-4 py-3">
                    <span className="text-sm font-semibold text-zinc-200">Media Gallery</span>
                    <button
                        onClick={() => setGalleryOpen(false)}
                        aria-label="Close gallery"
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                    {sessionMedia.length === 0 ? (
                        <p className="py-10 text-center text-xs text-zinc-500">
                            Generate media to see it here.
                        </p>
                    ) : (
                        sessionMedia.map((item, i) => (
                            <div
                                key={i}
                                className="overflow-hidden rounded-xl border border-zinc-900 bg-zinc-900/50"
                            >
                                {item.type === 'video' ? (
                                    <video src={item.url} controls className="w-full" />
                                ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={item.url}
                                        alt="Generated media"
                                        className="w-full object-cover"
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ── Floating gallery tab (scroll-direction aware) ── */}
            {!galleryOpen && (
                <button
                    onClick={() => setGalleryOpen(true)}
                    aria-label="Open media gallery"
                    className={`fixed right-0 top-1/2 z-40 -translate-y-1/2 rounded-l-2xl border border-r-0 border-zinc-800 bg-zinc-900 px-2 py-4 text-xs font-medium text-zinc-300 shadow-lg transition-all duration-300 hover:bg-zinc-800 ${tabVisible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0 pointer-events-none'}`}
                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                >
                    Gallery
                </button>
            )}

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
                {/* ── Header ── */}
                <header
                    className="rounded-3xl border border-zinc-900 p-6 shadow-2xl"
                    style={{
                        background: 'radial-gradient(circle at top, rgba(168,85,247,0.15) 0%, transparent 55%), rgb(9 9 11)',
                    }}
                >
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
                                onClick={() => setShowMediaModal(true)}
                                className="rounded-2xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                Generate Media
                            </button>
                            <button
                                onClick={handleGenerateAll}
                                className="rounded-2xl bg-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                            >
                                Generate All
                            </button>
                            <button
                                onClick={() => setScene(randomOf(SCENARIOS))}
                                className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-800"
                            >
                                New Scene
                            </button>
                            <button
                                onClick={handleCopyProfile}
                                className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-semibold transition hover:bg-zinc-800"
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
