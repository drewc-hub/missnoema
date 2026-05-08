// file: src/app/adult/companions/new/page.tsx
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { Card, CardBody, Badge } from "@/components/ui";

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
                        <h1 className="text-2xl font-semibold tracking-tight">
                            Create adult companion
                        </h1>
                        <p className="text-sm text-zinc-400">
                            Build an 18+ companion profile, then save it to unlock media generation.
                        </p>
                    </div>
                    <Badge tone="adult">18+ verified</Badge>
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
                    <div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Create adult images and videos
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                            Once you save your companion, generate NSFW photos and videos powered by Replicate AI — exclusive to verified members.
                        </p>
                    </div>

                    <Card className="h-full min-h-[520px]">
                        <CardBody className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-900/50 bg-rose-950/40 text-3xl">
                                🔞
                            </div>
                            <div>
                                <p className="font-semibold text-zinc-100">Media generation unlocks after saving</p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Fill out your companion profile on the left, then hit <span className="text-zinc-200">Create companion</span> to unlock the full studio.
                                </p>
                            </div>
                            <div className="mt-2 flex flex-wrap justify-center gap-2">
                                {["AI photos", "AI videos", "Custom scenes", "Wardrobe control"].map((f) => (
                                    <span
                                        key={f}
                                        className="rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-xs text-zinc-400"
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
