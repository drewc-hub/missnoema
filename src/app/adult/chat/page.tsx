// file: src/app/adult/chat/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { prisma } from "@/lib/prisma";
import { AdultChatGate } from "@/components/AdultChatGate";
import { CompanionChatWorkspace } from "@/components/CompanionChatWorkspace";
import { Visibility, ContentRating } from "@prisma/client";

type SearchParams = {
    companion?: string;
};

function buildNextAdultChatHref(companion?: string) {
    const params = new URLSearchParams();

    if (companion?.trim()) {
        params.set("companion", companion.trim());
    }

    const query = params.toString();
    return query ? `/adult/chat?${query}` : "/adult/chat";
}

export default async function AdultChatPage({
    searchParams,
}: {
    searchParams: Promise<SearchParams>;
}) {
    const sp = await searchParams;
    const requestedSlug = (sp.companion ?? "").trim();

    const user = await getAuthedUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent(buildNextAdultChatHref(requestedSlug))}`);
    }

    if (user.suspendedAt) {
        redirect("/adult");
    }

    const allowAdult = isAdultAllowed(user);

    if (!allowAdult) {
        redirect(
            `/adult/verify?next=${encodeURIComponent(buildNextAdultChatHref(requestedSlug))}`
        );
    }

    let initialCompanionId: string | undefined;

    if (requestedSlug) {
        const companion = await prisma.companion.findFirst({
            where: {
                slug: requestedSlug,
                contentRating: {
                    in: [ContentRating.SAFE, ContentRating.ADULT],
                },
                OR: [{ visibility: Visibility.PUBLIC }, { ownerId: user.id }],
            },
            select: {
                id: true,
            },
        });

        initialCompanionId = companion?.id;
    }

    return (
        <AdultChatGate storageKey={`adult_chat_gate_accepted_${user.id}`}>
            <CompanionChatWorkspace
                allowAdult={allowAdult}
                initialCompanionId={initialCompanionId}
            />
        </AdultChatGate>
    );
}
