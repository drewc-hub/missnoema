// file: src/app/companions/[slug]/edit/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import { ContentRating } from "@prisma/client";

export default async function EditCompanionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getAuthedUser();
  if (!user) {
    redirect("/login");
  }

  const allowAdult = isAdultAllowed(user);

  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      ownerId: user.id,
    },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      profile: true,
      contentRating: true,
      visibility: true,
    },
  });

  if (!companion) {
    return <main className="p-6">Not found</main>;
  }

  if (companion.contentRating === ContentRating.ADULT && !allowAdult) {
    redirect(
      `/adult/verify?next=${encodeURIComponent(`/companions/${slug}/edit`)}`,
    );
  }

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit companion
          </h1>
          <p className="text-sm text-zinc-400">
            Update your profile, then generate media for it.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone={companion.contentRating === "ADULT" ? "adult" : "safe"}>
            {companion.contentRating}
          </Badge>
          <Badge>{companion.visibility}</Badge>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-7">
          <Card>
            <CardHeader
              title="Builder"
              subtitle="Edit the companion profile and save changes."
            />
            <CardBody>
              <CompanionBuilder
                mode="edit"
                allowAdult={allowAdult}
                userEmail={user.email ?? null}
                companion={{ ...companion, profile: companion.profile as CompanionProfile | null }}
              />
            </CardBody>
          </Card>
        </section>

        <aside className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader
              title="Media generation"
              subtitle="Generate images and video for this companion."
            />
            <CardBody>
              <MediaGenPanel
                allowAdult={allowAdult}
                loggedIn={true}
                companionId={companion.id}
                contentRating={companion.contentRating}
                defaultTag={companion.tags?.[0] ?? ""}
              />
            </CardBody>
          </Card>
        </aside>
      </div>
    </main>
  );
}
