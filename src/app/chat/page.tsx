// app/chat/page.tsx
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/auth-user";
import { CompanionChatClient } from "@/components/chat/CompanionChatClient";
import type { UiChatMessage } from "@/lib/chat-types";

type SearchParams = Promise<{
  companion?: string;
}>;

export default async function ChatPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireAppUser();

  if (!user) {
    redirect("/login");
  }

  if (user.suspendedAt) {
    redirect("/");
  }

  const sp = await searchParams;
  const slug = (sp.companion ?? "").trim();

  if (!slug) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16 text-white">
        Missing companion slug.
      </main>
    );
  }

  const companion = await prisma.companion.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      archetype: true,
      greeting: true,
      scenario: true,
      profile: true,
      contentRating: true,
    },
  });

  if (!companion || companion.contentRating !== "SAFE") {
    redirect("/companions");
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      userId_companionId: {
        userId: user.id,
        companionId: companion.id,
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const messages: UiChatMessage[] = conversation?.messages.length
    ? conversation.messages.map((message) => ({
        id: message.id,
        role: message.role === "assistant" ? "character" : (message.role as "system" | "user"),
        content: message.content,
      }))
    : [
        {
          id: "greeting",
          role: "character",
          content: companion.greeting ?? `Hello. I'm ${companion.name}.`,
        },
      ];

  return (
    <CompanionChatClient
      companionId={companion.id}
      companionName={companion.name}
      initialConversationId={conversation?.id ?? null}
      initialMessages={messages}
    />
  );
}
