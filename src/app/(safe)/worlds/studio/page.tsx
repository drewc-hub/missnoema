import { redirect } from "next/navigation";
import { WorldStudioClient } from "@/components/WorldStudioClient";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function profileString(profile: unknown, key: string) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        return "";
    }

    const value = (profile as Record<string, unknown>)[key];
    return typeof value === "string" ? value : "";
}

export default async function WorldStudioPage() {

    const user = await getAuthedUser();
    if (!user) {
        redirect(`/login?next=${encodeURIComponent("/worlds/studio")}`);
    }

    const [worlds, companions] = await Promise.all([
        prisma.world.findMany({
            where: {
                members: {
                    some: { userId: user.id },
                },
            },
            orderBy: [{ lastActivityAt: "desc" }],
            take: 30,
            select: {
                id: true,
                slug: true,
                name: true,
                summary: true,
                setting: true,
                _count: { select: { members: true, messages: true } },
            },
        }),
        prisma.companion.findMany({
            where: { ownerId: user.id },
            orderBy: [{ updatedAt: "desc" }],
            take: 40,
            select: {
                id: true,
                slug: true,
                name: true,
                description: true,
                tags: true,
                profile: true,
                contentRating: true,
                visibility: true,
                scenario: true,
                greeting: true,
                bio: true,
            },
        }),
    ]);

    const ageVerified = !!user.ageVerifiedAt;

    return (
        <div class="custom-bg">
            <main className="relative left-1/2 w-[calc(100vw-2rem)] max-w-[1680px] -translate-x-1/2 space-y-4 text-zinc-100">
                <section className="mx-auto max-w-6xl">
                    <div className="inline-flex items-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                        Dungeon creator
                    </div>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
                        World and character studio
                    </h1>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                        Build worlds, scenes, and SillyTavern V2-style character cards from one workspace.
                    </p>
                </section>

                <div class="studioc-bg">
                    <WorldStudioClient
                        ageVerified={ageVerified}
                        worlds={worlds.map((world) => ({
                            id: world.id,
                            slug: world.slug,
                            name: world.name,
                            summary: world.summary,
                            setting: world.setting ?? "",
                            memberCount: world._count.members,
                            messageCount: world._count.messages,
                        }))}
                        companions={companions.map((companion) => {
                            const profile = companion.profile;
                            const isAdult = companion.contentRating === "ADULT";

                            return {
                                id: companion.id,
                                slug: companion.slug,
                                name: companion.name,
                                description: companion.description,
                                tags: companion.tags,
                                contentRating: companion.contentRating,
                                visibility: companion.visibility,
                                editHref: isAdult
                                    ? `/adult/companions/${companion.slug}/edit`
                                    : `/companions/${companion.slug}/edit`,
                                profile: {
                                    tagline:
                                        profileString(profile, "tagline") ||
                                        profileString(profile, "description") ||
                                        companion.description,
                                    role:
                                        profileString(profile, "role") ||
                                        profileString(profile, "archetype") ||
                                        "",
                                    personality: profileString(profile, "personality"),
                                    appearance:
                                        profileString(profile, "appearance") ||
                                        profileString(profile, "wardrobe"),
                                    backstory:
                                        profileString(profile, "backstory") ||
                                        profileString(profile, "background") ||
                                        companion.bio ||
                                        "",
                                    speakingStyle:
                                        profileString(profile, "speakingStyle") ||
                                        profileString(profile, "speechPattern") ||
                                        profileString(profile, "voiceStyle"),
                                    goals: profileString(profile, "goals"),
                                    scenario: companion.scenario || profileString(profile, "scenario") || profileString(profile, "scene"),
                                    lore: profileString(profile, "lore"),
                                    memory: profileString(profile, "memory"),
                                    greeting: companion.greeting || profileString(profile, "first_mes") || profileString(profile, "greeting"),
                                    exampleDialogue:
                                        profileString(profile, "mes_example") ||
                                        profileString(profile, "exampleDialogue"),
                                    systemPrompt:
                                        profileString(profile, "system_prompt") ||
                                        profileString(profile, "systemPrompt") ||
                                        profileString(profile, "aiPersonalityPrompt"),
                                    postHistoryInstructions:
                                        profileString(profile, "post_history_instructions") ||
                                        profileString(profile, "postHistoryInstructions"),
                                    creatorNotes:
                                        profileString(profile, "creator_notes") ||
                                        profileString(profile, "creatorNotes"),
                                    sliders: (() => {
                                        const bm = profile && typeof profile === "object"
                                            ? (profile as Record<string, unknown>).behaviorMeta
                                            : null;
                                        const b = bm && typeof bm === "object" ? bm as Record<string, unknown> : {};
                                        return {
                                            jealousy: typeof b.jealousyLevel === "number" ? b.jealousyLevel : 20,
                                            dominance: typeof b.dominanceLevel === "number" ? b.dominanceLevel : 20,
                                            affection: typeof b.affectionLevel === "number" ? b.affectionLevel : 60,
                                            empathy: typeof b.empathyLevel === "number" ? b.empathyLevel : 50,
                                        };
                                    })(),
                                },
                            };
                        })}
                    />
                </div>
            </main>
        </div>
    );
}
