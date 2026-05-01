// file: src/components/companion/CompanionDetailPage.tsx
import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";
import { ContentRating, Visibility } from "@prisma/client";

type Props = {
  slug: string;
  mode: "safe" | "adult";
};

export async function CompanionDetailPage({ slug, mode }: Props) {
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);

  const allowedRatings: ContentRating[] =
    mode === "adult"
      ? [ContentRating.SAFE, ContentRating.ADULT]
      : allowAdult
        ? [ContentRating.SAFE, ContentRating.ADULT]
        : [ContentRating.SAFE];

  if (mode === "adult" && !allowAdult) {
    redirect(
      `/adult/verify?next=${encodeURIComponent(`/adult/companions/${slug}`)}`,
    );
  }

  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      visibility: Visibility.PUBLIC,
      contentRating: { in: allowedRatings },
    },
    select: {
      id: true,
      slug: true,
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
    if (mode === "adult") {
      redirect(
        `/adult/verify?next=${encodeURIComponent(`/adult/companions/${slug}`)}`,
      );
    }
    redirect(`/companions`);
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
