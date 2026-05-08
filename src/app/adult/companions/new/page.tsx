// file: src/app/adult/companions/new/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";

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
        <main className="space-y-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Create adult companion
                    </h1>
                    <p className="text-sm text-zinc-400">
                        Build an 18+ companion profile, then save it to unlock media
                        generation.
                    </p>
                </div>

                <Badge tone="adult">18+ verified</Badge>
            </div>

            <Card>
                <CardHeader
                    title="New adult companion"
                    subtitle="Create the profile first. After saving, you can generate photos and video."
                />
                <CardBody>
                    <CompanionBuilder
                        mode="create"
                        allowAdult={allowAdult}
                        userEmail={user.email ?? null}
                        companion={draftCompanion}
                    />
                </CardBody>
            </Card>

            <aside className="space-y-4 lg:col-span-5">
                <MediaGenPanel
                    allowAdult={allowAdult}
                    loggedIn={!!user}
                    companionId={companion.id}
                    contentRating={companion.contentRating}
                    defaultTag={companion.tags?.[0] ?? ""}
                />
            </aside>

        </main>
    );
}
