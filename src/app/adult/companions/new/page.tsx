// file: src/app/adult/companions/new/page.tsx

import { redirect } from "next/navigation";
import { BookOpen, MessageCircle } from "lucide-react";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";

export default async function NewAdultCompanionPage({
    searchParams,
}: {
    searchParams?: Promise<{ mode?: string }>;
}) {
    const user = await getAuthedUser();

    if (!user) {
        redirect("/login");
    }

    const allowAdult = isAdultAllowed(user);

    if (!allowAdult) {
        redirect(
            `/adult/verify?next=${encodeURIComponent("/adult/companions/new")}`,
        );
    }

    const params = await searchParams;
    const createMode = params?.mode === "rp" ? "rp" : "companion";
    const isRpCharacter = createMode === "rp";

    const draftCompanion = {
        id: "",
        slug: "",
        name: "",
        description: "",
        tags: isRpCharacter ? ["adult", "roleplay", "story-mode"] : [],
        archetype: isRpCharacter ? "Adult RP story character" : "",
        visibility: "UNLISTED" as const,
        contentRating: "ADULT" as const,
        profile: {
            scene: isRpCharacter
                ? "Opening adult roleplay scene, setting, stakes, and boundaries for Story Mode narration."
                : "",
            background: isRpCharacter
                ? "Backstory, unresolved tension, relationships, motivations, secrets, and story hooks."
                : "",
            personality: isRpCharacter
                ? "Adult roleplay personality, dialogue style, consent cues, emotional tells, and reactions under pressure."
                : "",
            wardrobe: "",
            traits: isRpCharacter ? ["adult roleplay", "narrative"] : [],
            sliders: {
                warmth: 55,
                humor: 45,
                flirtiness: 55,
                dominance: 35,
            },
            boundaries: [
                "adults only",
                "no coercion",
                "no non-consensual content",
                "no underage themes",
                "no incest",
            ],
        },
    };

    return (
        <div className="custom-bg">
            <main className="min-h-screen px-4 py-6 lg:px-8">
                <div className="mx-auto w-full max-w-[1800px]">
                    <div className="mb-6">
                        <div className="inline-flex items-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs tracking-wide text-fuchsia-300 mb-3">
                            {isRpCharacter ? "18+ Story Mode Creator" : "18+ Creator Studio"}
                        </div>

                        <h1 className="text-3xl font-black tracking-tight text-white">
                            Create{" "}
                            <span className="text-zinc-300">
                                {isRpCharacter ? "RP character" : "companion"}
                            </span>
                        </h1>

                        <p className="mt-2 text-sm text-zinc-400">
                            {isRpCharacter
                                ? "Build an adult-gated Story Mode character for saved RP campaigns with narration and scene visuals."
                                : "Build immersive AI companions with advanced personality, dialogue, emotional sliders, and Character Card V2 support."}
                        </p>
                    </div>

                    <section className="mb-6 grid gap-3 sm:grid-cols-2">
                        <a
                            href="/adult/companions/new"
                            className={
                                createMode === "companion"
                                    ? "rounded-lg border border-fuchsia-500/60 bg-fuchsia-500/10 p-4 text-white"
                                    : "rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-300 transition hover:border-fuchsia-500/60 hover:text-white"
                            }
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <MessageCircle className="h-4 w-4 text-fuchsia-300" />
                                Adult Companion Chat
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                                Adult-gated companion conversation with the same prohibited-content blocks.
                            </p>
                        </a>

                        <a
                            href="/adult/companions/new?mode=rp"
                            className={
                                isRpCharacter
                                    ? "rounded-lg border border-rose-400/60 bg-rose-500/10 p-4 text-white"
                                    : "rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-zinc-300 transition hover:border-rose-400/60 hover:text-white"
                            }
                        >
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                <BookOpen className="h-4 w-4 text-rose-300" />
                                Adult RP Story Character
                            </div>
                            <p className="mt-2 text-sm leading-6 text-zinc-400">
                                18+ Story Mode character setup. Underage, non-consent, sexual violence, and incest are blocked.
                            </p>
                        </a>
                    </section>

                    {/* Full-width builder */}
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
