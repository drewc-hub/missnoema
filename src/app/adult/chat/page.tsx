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

export default async function AdultChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const user = await getAuthedUser();
  if (!user) {
    redirect("/login?next=/adult/chat");
  }

  const allowAdult = isAdultAllowed(user);
  if (!allowAdult) {
    redirect(`/adult/verify?next=${encodeURIComponent("/adult/chat")}`);
  }

  const requestedSlug = (sp.companion ?? "").trim();

  let initialCompanionId: string | undefined;

  if (requestedSlug) {
    const companion = await prisma.companion.findFirst({
      where: {
        slug: requestedSlug,
        visibility: Visibility.PUBLIC,
        contentRating: { in: [ContentRating.SAFE, ContentRating.ADULT] },
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
