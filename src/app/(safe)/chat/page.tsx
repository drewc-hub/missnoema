import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CompanionChatWorkspace } from "@/components/CompanionChatWorkspace";
import { Visibility } from "@prisma/client";

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

  const requestedSlug = (sp.companion ?? "").trim();
  let initialCompanionId: string | undefined;

  if (requestedSlug) {
    const companion = await prisma.companion.findFirst({
      where: { slug: requestedSlug, visibility: Visibility.PUBLIC },
      select: { id: true },
    });
    initialCompanionId = companion?.id;
  }

  return (
    <CompanionChatWorkspace
      allowAdult={false}
      initialCompanionId={initialCompanionId}
    />
  );
}
