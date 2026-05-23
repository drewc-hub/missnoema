import { AdultNoemaAvatarVideo } from "@/components/AdultNoemaAvatarVideo";

export default function AdultPage() {
    return (
        <main className="min-h-screen overflow-hidden rounded-2xl border border-zinc-900 bg-black text-white">
            {/* HERO */}
            <section className="relative overflow-hidden border-b border-zinc-800">
                <div className="rounded-lg absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)]" />

                <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-24 lg:grid-cols-2 lg:items-start">
                    {/* Left — title, description, buttons */}
                    <div className="space-y-6">
                        <div className="inline-flex items-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-1 text-sm tracking-wide text-fuchsia-300">
                            Adaptive AI Companion Ecosystem
                        </div>

                        <h1 className="text-5xl font-black leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                            Noema AI<span className="text-fuchsia-400">Companion</span>
                        </h1>

                        <p className="max-w-2xl text-lg leading-8 text-zinc-300 sm:text-xl">
                            Noema is an adaptive AI companion platform built around RAG, persistent, and LTM
                            memory, emotional continuity, and evolving relationships.
                            Unlike traditional chatbot apps, Noema companions remember
                            conversations, emotional moments, preferences, relationship
                            milestones, and personal details over time — creating
                            interactions that feel natural, reactive, and deeply personal.
                        </p>

                        <div className="flex flex-wrap gap-4 pt-4">
                            <a
                                href="/adult/companions"
                                className="rounded-2xl bg-fuchsia-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                            >
                                Explore Companions
                            </a>

                            <a
                                href="/adult/companions/new"
                                className="rounded-2xl border border-zinc-700 bg-zinc-900/70 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500 hover:text-white"
                            >
                                Create Your Own
                            </a>
                        </div>
                    </div>

                    {/* Right — video at top, feature tiles below */}
                    <div className="hidden sm:flex shrink-0 w-[25%] items-center justify-start">
                        <AdultNoemaAvatarVideo />
                    </div>

                    {/* Feature tiles — Custom Personalities row aligns with buttons */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            "Persistent Memory",
                            "Relationship Progression",
                            "Emotional Modeling",
                            "RAG VectorAI DB",
                            "Media Generation",
                            "Adult-Gated Experiences",
                            "Custom Personalities",
                            "Adaptive Conversations",
                        ].map((item) => (
                            <div
                                key={item}
                                className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl backdrop-blur"
                            >
                                <p className="text-sm font-medium text-zinc-200">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* STORY */}
            <section className="mx-auto max-w-7xl px-6 py-24">
                <div className="grid gap-16 lg:grid-cols-2">
                    <div className="space-y-6">
                        <div className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1 text-sm text-zinc-400">
                            The Vision
                        </div>

                        <h2 className="text-4xl font-bold tracking-tight">
                            More than a chatbot.
                        </h2>

                        <div className="space-y-5 text-lg leading-8 text-zinc-300">
                            <p>
                                Most AI chat applications reset emotionally every session.
                                Noema was designed to solve that problem.
                            </p>

                            <p>
                                Every companion is powered by layered memory systems that track
                                familiarity, trust, intimacy, emotional patterns, relationship
                                progression, and long-term continuity. Conversations evolve over
                                time instead of starting from zero.
                            </p>

                            <p>
                                Companions can adapt emotionally, remember recurring themes,
                                respond differently based on relationship history, and develop
                                unique conversational dynamics with every user.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
                        <div className="space-y-6">
                            <div>
                                <p className="text-sm uppercase tracking-[0.3em] text-fuchsia-400">
                                    Core Systems
                                </p>
                            </div>

                            <div className="space-y-5">
                                {[
                                    {
                                        title: "Persistent Memory",
                                        desc: "Companions retain emotional context, conversation history, and relationship milestones.",
                                    },
                                    {
                                        title: "Adaptive Personality Engines",
                                        desc: "Behavior evolves dynamically based on emotional state, intimacy, trust, and user interaction patterns.",
                                    },
                                    {
                                        title: "Immersive Media Generation",
                                        desc: "Integrated AI image and video generation designed directly into the companion experience.",
                                    },
                                    {
                                        title: "SAFE + Adult Ecosystem",
                                        desc: "Structured content separation allows SAFE experiences while supporting opt-in adult-gated interactions.",
                                    },
                                ].map((feature) => (
                                    <div
                                        key={feature.title}
                                        className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5"
                                    >
                                        <h3 className="text-lg font-semibold text-white">
                                            {feature.title}
                                        </h3>
                                        <p className="mt-2 text-sm leading-7 text-zinc-400">
                                            {feature.desc}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* PHILOSOPHY */}
            <section className="border-y border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)]">
                <div className="mx-auto max-w-6xl px-6 py-24 text-center">
                    <p className="text-sm uppercase tracking-[0.4em] text-fuchsia-400">
                        Platform Philosophy
                    </p>

                    <h2 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                        Built for immersion,
                        continuity, and emotional realism.
                    </h2>

                    <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-zinc-400">
                        Noema is designed to feel less like a scripted assistant and more
                        like a living digital relationship ecosystem. The platform focuses
                        on long-term interaction quality rather than aggressive paywalls or
                        shallow engagement loops.
                    </p>
                </div>
            </section>

            {/* STATS */}
            <section className="mx-auto max-w-7xl px-6 py-24">
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        {
                            value: "1000+",
                            label: "Companion Profiles",
                        },
                        {
                            value: "Persistent",
                            label: "Relationship Memory",
                        },
                        {
                            value: "SAFE + 18+",
                            label: "Content Ecosystem",
                        },
                        {
                            value: "Realtime",
                            label: "AI Media Generation",
                        },
                    ].map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 text-center"
                        >
                            <div className="text-4xl font-black text-fuchsia-400">
                                {stat.value}
                            </div>
                            <div className="mt-3 text-sm uppercase tracking-wide text-zinc-400">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section className="border-t border-zinc-800">
                <div className="mx-auto max-w-5xl px-6 py-24 text-center">
                    <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
                        Engineer your ideal companion.
                    </h2>

                    <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
                        Explore evolving AI relationships, immersive conversations,
                        adaptive personalities, and integrated media generation — all
                        inside the Noema ecosystem.
                    </p>

                    <div className="mt-10 flex flex-wrap justify-center gap-4">
                        <a
                            href="/adult/companions"
                            className="rounded-2xl bg-fuchsia-500 px-7 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400"
                        >
                            Enter Ecosystem
                        </a>

                        <a
                            href="/adult/companions/new"
                            className="rounded-2xl border border-zinc-700 bg-zinc-900 px-7 py-3 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500 hover:text-white"
                        >
                            Build Companion
                        </a>
                    </div>
                </div>
            </section>
        </main >
    );
}
