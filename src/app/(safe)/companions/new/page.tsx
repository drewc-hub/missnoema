// file: src/app/companions/[slug]/page.tsx
import { redirect } from "next/navigation";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string }>;
}) {
    const { slug } = await params;

    const user = await getAuthedUser();
    const allowAdult = isAdultAllowed(user);

    const allowedRatings: ContentRating[] = [ContentRating.SAFE];
    if (allowAdult) allowedRatings.push(ContentRating.ADULT);

    const companion = await prisma.companion.findFirst({
        where: {
            slug,
            visibility: Visibility.PUBLIC,
            contentRating: { in: allowedRatings },
        },
        select: {
            id: true,
            name: true,
            description: true,
            tags: true,
            profile: true,
            contentRating: true,
        },
    });

    if (!companion) {
        return <main className="p-6">Not found</main>;
    }

    if (companion.contentRating === ContentRating.ADULT && !allowAdult) {
        redirect("/companions");
    }

    return (
        <main className="mx-auto w-full max-w-7xl px-4 py-6">
            <div className="grid gap-6 lg:grid-cols-12 lg:items-start">
                {/* LEFT */}
                <section className="lg:col-span-7">
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
                        <CompanionBuilder
                            allowAdult={allowAdult}
                            userEmail={user?.email ?? null}
                            companion={companion}
                        />
                    </div>
                </section>

                {/* RIGHT */}
                <aside className="lg:col-span-5">
                    <div className="sticky top-6">
                        <div className="rounded-2xl border border-zinc-800 bg-zinc-950">
                            <MediaGenPanel
                                allowAdult={allowAdult}
                                loggedIn={!!user}
                                companionId={companion.id}
                                contentRating={companion.contentRating}
                                defaultTag={companion.tags?.[0] ?? ""}
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </main>
    );
}
