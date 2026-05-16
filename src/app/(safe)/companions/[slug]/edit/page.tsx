import { redirect } from "next/navigation";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { CompanionEditLayout } from "@/components/CompanionEditLayout";
import { Badge } from "@/components/ui";

export default async function EditSafeCompanionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getAuthedUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/companions/${slug}/edit`)}`);
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
    return <main className="p-6 text-zinc-400">Companion not found.</main>;
  }

  if (companion.contentRating === ContentRating.ADULT) {
    redirect(`/adult/companions/${slug}/edit`);
  }

  const listing = companion.marketplaceListings ?? null;

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit companion</h1>
          <p className="text-sm text-zinc-400">
            Update the profile, visibility, and media for this companion.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="safe">SAFE</Badge>
          <Badge>{companion.visibility}</Badge>
          <a
            href="/creator"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
          >
            Creator studio
          </a>
        </div>
      </div>

      <CompanionEditLayout
        allowAdult={false}
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
          contentRating: "SAFE",
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
