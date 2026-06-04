import { redirect } from "next/navigation";
import { BookOpen, MessageCircle, ShieldCheck } from "lucide-react";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";

export default async function NewSafeCompanionPage({
    searchParams,
}: {
    searchParams?: Promise<{ mode?: string }>;
}) {
    const user = await getAuthedUser();
    if (!user) {
        redirect("/login");
    }

    const allowAdult = isAdultAllowed(user);
    const params = await searchParams;
    const createMode = params?.mode === "rp" ? "rp" : "companion";
    const isRpCharacter = createMode === "rp";

    const draftCompanion = {
        id: "",
        slug: "",
        name: "",
        description: "",
        tags: isRpCharacter ? ["roleplay", "story-mode", "narrative"] : [],
        archetype: isRpCharacter ? "RP story character" : "",
        visibility: "UNLISTED" as const,
        contentRating: "SAFE" as const,
        profile: {
            scene: isRpCharacter
                ? "Opening scene, setting, stakes, and the kind of story this character belongs in."
                : "",
            background: isRpCharacter
                ? "Backstory, unresolved conflict, relationships, fears, goals, and secrets the narrator can build from."
                : "",
            personality: isRpCharacter
                ? "Roleplay personality, dialogue style, emotional tells, motivations, and how they react under pressure."
                : "",
            wardrobe: "",
            traits: isRpCharacter ? ["narrative", "scene-driven"] : [],
            sliders: {
                warmth: 55,
                humor: 45,
                flirtiness: isRpCharacter ? 20 : 30,
                dominance: isRpCharacter ? 40 : 30,
            },
            boundaries: isRpCharacter
                ? [
                    "story mode character",
                    "narrator may describe the scene",
                    "no underage sexual content",
                    "no sexual violence or non-consensual sexual content",
                    "no incest",
                ]
                : [],
        },
    };

    return (
        <div className="custom-bg">
        <main className="min-h-screen px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1800px]">
                <div className="mb-6">
                    <div className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/30 px-3 py-1 text-xs tracking-wide text-zinc-400 mb-3">
                        {isRpCharacter ? "Story Mode creator" : "Creator studio"}
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-white">
                        Create{" "}
                        <span className="text-zinc-300">
                            {isRpCharacter ? "RP character" : "companion"}
                        </span>
                    </h1>

                    <p className="mt-2 text-sm text-zinc-400">
                        {isRpCharacter
                            ? "Build a character tuned for saved Story Mode campaigns, narration, scene art, and structured roleplay."
                            : "Build immersive AI companions with advanced personality, dialogue, emotional sliders, and Character Card V2 support."}
                    </p>
                </div>

                <section className="mb-6 grid gap-3 lg:grid-cols-3">
                    <a
                        href="/companions/new"
                        className={
                            createMode === "companion"
                                ? "rounded-lg border border-fuchsia-500/60 bg-fuchsia-500/10 p-4 text-white"
                                : "rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-300 transition hover:border-fuchsia-500/60 hover:text-white"
                        }
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <MessageCircle className="h-4 w-4 text-fuchsia-300" />
                            Companion Chat
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                            Open-ended character chat, relationship continuity, and normal companion conversation.
                        </p>
                    </a>

                    <a
                        href="/companions/new?mode=rp"
                        className={
                            isRpCharacter
                                ? "rounded-lg border border-blue-400/60 bg-blue-500/10 p-4 text-white"
                                : "rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-300 transition hover:border-blue-400/60 hover:text-white"
                        }
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <BookOpen className="h-4 w-4 text-blue-300" />
                            RP Story Character
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                            Character setup for `/rp` Story Mode with narrator-led scenes, arcs, and generated visuals.
                        </p>
                    </a>

                    <a
                        href={
                            allowAdult
                                ? "/adult/companions/new?mode=rp"
                                : `/adult/verify?next=${encodeURIComponent("/adult/companions/new?mode=rp")}`
                        }
                        className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-300 transition hover:border-rose-400/60 hover:text-white"
                    >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                            <ShieldCheck className="h-4 w-4 text-rose-300" />
                            Adult RP Character
                        </div>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                            18+ gated roleplay setup. Prohibited content remains blocked.
                        </p>
                    </a>
                </section>

                <div className="w-full">
                    <CompanionBuilder
                        mode="create"
                        allowAdult={allowAdult}
                        userEmail={user.email ?? null}
                        companion={draftCompanion}
                        fullPageMode
                    />
                </div>
            </div>
        </main>
        </div>
    );
}
