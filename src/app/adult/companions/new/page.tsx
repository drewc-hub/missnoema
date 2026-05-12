// file: src/app/adult/companions/new/page.tsx
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { Card, CardBody } from "@/components/ui";

export default async function NewAdultCompanionPage() {
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

    const draftCompanion = {
        id: "",
        slug: "",
        name: "",
        description: "",
        tags: [],
        archetype: "",
        visibility: "UNLISTED" as const,
        contentRating: "ADULT" as const,
        profile: {
            scene: "",
            background: "",
            personality: "",
            wardrobe: "",
            traits: [],
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
        <main className="grid gap-5 lg:grid-cols-12">
            <section className="space-y-4 lg:col-span-7">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <div className="inline-flex items-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs tracking-wide text-fuchsia-300 mb-2">
                            18+ verified access
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">
                            Create <span className="text-fuchsia-400">adult companion</span>
                        </h1>
                        <p className="mt-1 text-sm text-zinc-400">
                            Build an 18+ companion profile, then save to unlock the full media studio.
                        </p>
                    </div>
                </div>

                <CompanionBuilder
                    mode="create"
                    allowAdult={allowAdult}
                    userEmail={user.email ?? null}
                    companion={draftCompanion}
                />
            </section>

            <aside className="lg:col-span-5">
                <div className="sticky top-6 space-y-4">
                    <div className="inline-flex items-center rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs tracking-wide text-fuchsia-300">
                        18+ verified access
                    </div>
                    <h2 className="text-xl font-bold tracking-tight">
                        AI images &amp; videos <span className="text-fuchsia-400">unlocked</span> after saving
                    </h2>
                    <p className="text-sm text-zinc-400">
                        Fill out the profile on the left, then hit <span className="text-zinc-200 font-medium">Create companion</span> to access the full studio.
                    </p>

                    <Card className="border-fuchsia-900/30 bg-black/80 shadow-[0_0_60px_rgba(168,85,247,0.07)]">
                        <CardBody className="flex flex-col items-center justify-center gap-5 py-14 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-fuchsia-900/50 bg-fuchsia-950/40 text-3xl">
                                🔞
                            </div>
                            <div className="space-y-1">
                                <p className="font-semibold text-zinc-100">Studio unlocks on save</p>
                                <p className="text-sm text-zinc-500">Generate NSFW photos and videos exclusive to subscribers.</p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2">
                                {["AI photos", "AI videos", "Custom scenes", "Wardrobe control", "Outfit swap", "Adult-gated"].map((f) => (
                                    <span
                                        key={f}
                                        className="rounded-full border border-fuchsia-900/40 bg-fuchsia-950/20 px-3 py-1 text-xs text-fuchsia-300"
                                    >
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </CardBody>
                    </Card>
                </div>
            </aside>
        </main>
    );
}
