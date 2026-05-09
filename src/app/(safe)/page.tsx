// file: src/app/page.tsx
import React from "react";
import { Card, CardBody, CardHeader, Button, Badge } from "@/components/ui";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export default async function HomePage() {
    const user = await getAuthedUser();
    const adultOk = isAdultAllowed(user);

    return (
        <main className="space-y-8">
            {/* Hero */}
            <section className="rounded-3xl border border-blue-900/60 bg-gradient-to-b from-blue-950/80 to-blue-950/40 p-8">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="safe">SAFE by default</Badge>
                        <Badge>Web-first creator tools</Badge>
                        <Badge>18+ gated (web-only)</Badge>
                    </div>

                    <h1 className="text-4xl font-semibold tracking-tight text-zinc-100">
                        Your companion universe, designed your way.
                    </h1>

                    <p className="max-w-2xl text-sm leading-relaxed text-zinc-300">
                        Explore a curated library, create your own companions, and generate media on the web. SAFE content is the
                        default experience. Adult content is opt-in, clearly labeled, and age-gated.
                    </p>

                    <div className="flex flex-wrap gap-2 pt-2">
                        <a href="/companions">
                            <Button>Browse companions</Button>
                        </a>
                        <a href="/companions/new">
                            <Button variant="secondary">Create your own</Button>
                        </a>
                        <a href={adultOk ? "/adult/companions" : "/adult/verify?next=/adult/companions"}>
                            <Button variant="ghost" className="border border-zinc-800">
                                {adultOk ? "Adult library" : "Verify for 18+"}
                            </Button>
                        </a>
                    </div>

                    {user ? (
                        <div className="pt-2 text-xs text-zinc-500">
                            Signed in as <span className="text-zinc-300">{user.email ?? "user"}</span>
                            {adultOk ? " • Verified 18+" : " • 18+ not verified"}
                        </div>
                    ) : (
                        <div className="pt-2 text-xs text-zinc-500">
                            You&apos;re browsing as a guest.{" "}
                            <a className="text-zinc-200 underline" href="/login">Login</a> to generate media.
                        </div>
                    )}
                </div>
            </section>

            {/* Memory features */}
            <section className="rounded-2xl border-2px border-zinc-100/40 bg-gradient-to-b from-blue-950/60 to-zinc-900/60 p-6 space-y-6">
                <div className="space-y-1">
                    <h2 className="text-lg font-semibold text-zinc-100">
                        Memory that actually works.
                    </h2>
                    <p className="text-sm text-zinc-400 max-w-2xl">
                        Most AI companions forget you the moment the conversation ends. Noema is built differently — every session builds on the last, so your companions grow with you over time.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    {/* Longer context window */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📖</span>
                            <span className="font-medium text-zinc-100">Longer context window</span>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Your plan determines how many recent messages stay live in the AI&apos;s awareness — up to 40 messages at a time on Unlimited. The AI always knows what was just said, not just the last two lines.
                        </p>
                        <div className="flex gap-2 flex-wrap pt-1">
                            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">Basic · 12 messages</span>
                            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400">Pro · 25 messages</span>
                            <span className="rounded-full bg-blue-900/60 px-2.5 py-1 text-xs text-blue-300">Unlimited · 40 messages</span>
                        </div>
                    </div>

                    {/* Saved fact list */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🗂️</span>
                            <span className="font-medium text-zinc-100">Saved fact list</span>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Tell your companion your name, your kinks, your limits, your preferences — once. Those facts are automatically injected into every conversation so you never have to repeat yourself.
                        </p>
                        <div className="flex gap-2 flex-wrap pt-1">
                            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-500 italic">&quot;My name is Alex&quot;</span>
                            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-500 italic">&quot;I enjoy bondage&quot;</span>
                            <span className="rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-500 italic">&quot;Hard limits: …&quot;</span>
                        </div>
                    </div>

                    {/* Pinned messages */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">📌</span>
                            <span className="font-medium text-zinc-100">Pinned messages</span>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Pin any message — a confession, a promise, a defining moment — and it stays anchored in the AI&apos;s context permanently. No matter how long the conversation grows, pinned messages are never forgotten.
                        </p>
                    </div>

                    {/* Longitudinal understanding */}
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🧠</span>
                            <span className="font-medium text-zinc-100">Persistent longitudinal understanding</span>
                        </div>
                        <p className="text-sm text-zinc-400">
                            Behind the scenes, Noema continuously builds an emotional profile of you — your communication style, your recurring needs, moments of vulnerability. Companions develop a genuine sense of who you are across weeks and months of conversation.
                        </p>
                    </div>
                </div>

                <div className="pt-2 flex flex-wrap gap-3 items-center">
                    <a href="/companions">
                        <Button>Start a conversation</Button>
                    </a>
                    <span className="text-xs text-zinc-500">Memory builds automatically — no setup required.</span>
                </div>
            </section>

            {/* Feature cards — equal height, button pinned to bottom */}
            <section className="grid gap-4 lg:grid-cols-3">
                <Card className="flex flex-col">
                    <CardHeader title="Library" subtitle="Search, filter, and discover." />
                    <CardBody className="flex flex-col flex-1 gap-3">
                        <p className="flex-1 text-sm text-zinc-300">
                            Public SAFE companions show by default. Verified users can opt into 18+ browsing — all clearly labeled and age-gated.
                        </p>
                        <a href="/companions">
                            <Button variant="secondary" className="w-full">
                                Open library
                            </Button>
                        </a>
                    </CardBody>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader title="Creator" subtitle="Design personality + boundaries." />
                    <CardBody className="flex flex-col flex-1 gap-3">
                        <p className="flex-1 text-sm text-zinc-300">
                            Build companions with structured profiles — scene, backstory, personality sliders, kink tags, and relationship styles.
                        </p>
                        <a href="/companions/new">
                            <Button variant="secondary" className="w-full">
                                Create a companion
                            </Button>
                        </a>
                    </CardBody>
                </Card>

                <Card className="flex flex-col">
                    <CardHeader title="Generation" subtitle="Queue jobs, worker produces media." />
                    <CardBody className="flex flex-col flex-1 gap-3">
                        <p className="flex-1 text-sm text-zinc-300">
                            Generate images and video server-side. Assets are stored securely — adult content stays private behind signed URLs.
                        </p>
                        <a href="/companions">
                            <Button variant="secondary" className="w-full">
                                Generate from a companion
                            </Button>
                        </a>
                    </CardBody>
                </Card>
            </section>

        </main>
    );
}
