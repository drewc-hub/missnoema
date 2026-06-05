import React from "react";
import { redirect } from "next/navigation";
import { ContentRating, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { prisma } from "@/lib/prisma";
import { CompanionChatWorkspace } from "@/components/CompanionChatWorkspace";

type SearchParams = { companion?: string };

export default async function SafeChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const user = await getAuthedUser();

  if (!user) {
    redirect(`/login?next=/chat`);
  }
  const allowAdult = isAdultAllowed(user);

  const requestedSlug = (sp.companion ?? "").trim();
  let initialCompanionId: string | undefined;

  if (requestedSlug) {
    const companion = await prisma.companion.findFirst({
      where: {
        slug: requestedSlug,
        OR: [{ visibility: Visibility.PUBLIC }, { ownerId: user.id }],
      },
      select: { id: true, contentRating: true },
    });

    if (companion?.contentRating === ContentRating.ADULT) {
      if (!allowAdult) {
        const chatPath = `/chat?companion=${encodeURIComponent(requestedSlug)}`;
        redirect(`/adult/verify?next=${encodeURIComponent(chatPath)}`);
      }
    }

    initialCompanionId = companion?.id;
  }

  return (
    <CompanionChatWorkspace
      allowAdult={allowAdult}
      initialCompanionId={initialCompanionId}
    />
  );
}
