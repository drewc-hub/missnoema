// file: src/app/adult/companions/new/page.tsx

import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";

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
        <div className="custom-bg">
            <main className="min-h-screen px-4 py-6 lg:px-8">
                <div className="mx-auto w-full max-w-[1800px] bg-black">
                    <div className="mb-6">
                        <div className="inline-flex items-center rounded-full border border-blue-500/30 bg-black-500/10 px-3 py-1 text-xs tracking-wide text-blue-300 mb-3">
                            18+ verified access
                        </div>

                        <p className="mt-2 text-sm text-blue-100/70">
                            Build immersive AI companions with advanced personality,
                            dialogue, emotional sliders, and Character Card V2 support.
                        </p>
                    </div>

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
