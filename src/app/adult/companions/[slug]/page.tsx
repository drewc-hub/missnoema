// file: src/app/adult/companions/[slug]/page.tsx
import { redirect } from "next/navigation";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import CompanionBuilder from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);

  if (!allowAdult) {
    redirect(
      `/adult/verify?next=${encodeURIComponent(`/adult/companions/${slug}`)}`,
    );
  }

  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      visibility: Visibility.PUBLIC,
      contentRating: { in: [ContentRating.SAFE, ContentRating.ADULT] },
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

  return (
    <main className="grid gap-5 lg:grid-cols-12">
      <section className="space-y-4 lg:col-span-7">
        <CompanionBuilder
          allowAdult={allowAdult}
          userEmail={user?.email ?? null}
          companion={companion}
        />
      </section>

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
