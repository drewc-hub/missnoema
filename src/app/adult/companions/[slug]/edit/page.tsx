// file: src/app/adult/companions/[slug]/edit/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { CompanionEditLayout } from "@/components/CompanionEditLayout";
import { Badge } from "@/components/ui";

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
      gender: true,
      profile: true,
      contentRating: true,
      visibility: true,
      assets: {
        where: { type: "IMAGE" },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: { id: true },
      },
      marketplaceListings: {
        select: {
          id: true,
          status: true,
          priceCoins: true,
          priceUsdCents: true,
          updatedAt: true,
          publishedAt: true,
        },
      },
    },
  });

  if (!companion) {
    return <main className="p-6">Not found</main>;
  }

  if (companion.contentRating !== ContentRating.ADULT) {
    redirect(`/companions/${slug}/edit`);
  }

  const listing = companion.marketplaceListings ?? null;

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

      <CompanionEditLayout
        allowAdult={allowAdult}
        userEmail={user.email ?? null}
        companion={{
          id: companion.id,
          slug: companion.slug,
          name: companion.name,
          description: companion.description,
          tags: companion.tags,
          gender: companion.gender,
          archetype: companion.archetype ?? null,
          profile: companion.profile as Record<string, unknown> | null,
          contentRating: "ADULT",
          visibility: companion.visibility,
          assets: companion.assets,
          listing: listing
            ? {
                id: listing.id,
                status: listing.status,
                priceCoins: listing.priceCoins,
                priceUsdCents: listing.priceUsdCents,
                updatedAt: listing.updatedAt.toISOString(),
                publishedAt: listing.publishedAt?.toISOString() ?? null,
              }
            : null,
        }}
      />
    </main>
  );
}
