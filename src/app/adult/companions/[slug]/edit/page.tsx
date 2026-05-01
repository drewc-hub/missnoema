// file: src/app/adult/companions/[slug]/edit/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";

export default async function EditAdultCompanionPage({
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
  if (!allowAdult) {
    redirect(
      `/adult/verify?next=${encodeURIComponent(`/adult/companions/${slug}/edit`)}`,
    );
  }

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
      archetype: true,
      profile: true,
      contentRating: true,
      visibility: true,
    },
  });

  if (!companion) {
    return <main className="p-6">Not found</main>;
  }

  if (companion.contentRating !== ContentRating.ADULT) {
    redirect(`/companions/${slug}/edit`);
  }

  return (
    <main className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Edit adult companion
          </h1>
          <p className="text-sm text-zinc-400">
            Update the profile, then generate media for this 18+ companion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="adult">ADULT</Badge>
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
                companion={{
                  id: companion.id,
                  slug: companion.slug,
                  name: companion.name,
                  description: companion.description,
                  tags: companion.tags,
                  archetype: companion.archetype ?? "",
                  profile: companion.profile as any,
                  contentRating: "ADULT",
                  visibility: companion.visibility,
                }}
              />
            </CardBody>
          </Card>
        </section>

        <aside className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader
              title="Media generation"
              subtitle="Generate images and video for this adult companion."
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
