import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { Card, CardBody } from "@/components/ui";

export default async function NewSafeCompanionPage() {
    const user = await getAuthedUser();
    if (!user) {
        redirect("/login");
    }

    const draftCompanion = {
        id: "",
        slug: "",
        name: "",
        description: "",
        tags: [],
        archetype: "",
        visibility: "UNLISTED" as const,
        contentRating: "SAFE" as const,
        profile: {
            scene: "",
            background: "",
            personality: "",
            wardrobe: "",
            traits: [],
            sliders: {
                warmth: 55,
                humor: 45,
                flirtiness: 30,
                dominance: 30,
            },
            boundaries: [],
        },
    };

    return (
        <main className="grid gap-5 lg:grid-cols-12">
            <section className="space-y-4 lg:col-span-7">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Create companion
                    </h1>
                    <p className="text-sm text-zinc-400">
                        Build a companion profile, then save it to unlock chat and media generation.
                    </p>
                </div>

                <CompanionBuilder
                    mode="create"
                    allowAdult={false}
                    userEmail={user.email ?? null}
                    companion={draftCompanion}
                />
            </section>

            <aside className="lg:col-span-5">
                <div className="sticky top-6 space-y-4">
                    <div>
                        <div className="mb-2 inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900/70 px-3 py-1 text-xs tracking-wide text-zinc-300">
                            Creator studio
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Media generation
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                            Generate AI photos and videos after saving your companion.
                        </p>
                    </div>

                    <Card className="h-full min-h-[520px]">
                        <CardBody className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900/60 text-3xl">
                                🎨
                            </div>
                            <div>
                                <p className="font-semibold text-zinc-100">Media generation unlocks after saving</p>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Fill out the companion profile on the left, then hit{" "}
                                    <span className="text-zinc-200">Create companion</span> to unlock the full studio.
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
