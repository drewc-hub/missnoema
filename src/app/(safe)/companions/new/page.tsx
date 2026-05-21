import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { CompanionBuilder } from "@/components/CompanionBuilder";

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
        <div className="custom-bg">
        <main className="min-h-screen px-4 py-6 lg:px-8">
            <div className="mx-auto w-full max-w-[1800px]">
                <div className="mb-6">
                    <div className="inline-flex items-center rounded-full border border-zinc-700/50 bg-zinc-800/30 px-3 py-1 text-xs tracking-wide text-zinc-400 mb-3">
                        Creator studio
                    </div>

                    <h1 className="text-3xl font-black tracking-tight text-white">
                        Create{" "}
                        <span className="text-zinc-300">
                            companion
                        </span>
                    </h1>

                    <p className="mt-2 text-sm text-zinc-400">
                        Build immersive AI companions with advanced personality,
                        dialogue, emotional sliders, and Character Card V2 support.
                    </p>
                </div>

                <div className="w-full">
                    <CompanionBuilder
                        mode="create"
                        allowAdult={false}
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
