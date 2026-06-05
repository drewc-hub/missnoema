import { ContentRating, Visibility } from "@prisma/client";
import { redirect } from "next/navigation";
import { CompanionProfileView } from "@/components/CompanionProfileView";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdultAllowed } from "@/lib/ratings";

function profileText(profile: Record<string, unknown>, key: string) {
  const value = profile[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export default async function SafeCompanionDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);
  const allowedRatings = allowAdult
    ? [ContentRating.SAFE, ContentRating.ADULT]
    : [ContentRating.SAFE];

  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      contentRating: { in: allowedRatings },
      OR: [
        { visibility: Visibility.PUBLIC },
        ...(user ? [{ ownerId: user.id }] : []),
      ],
    },
    select: {
      id: true,
      ownerId: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      profile: true,
      contentRating: true,
      views: true,
      saves: true,
      assets: {
        where: {
          type: "IMAGE",
          contentRating: { in: allowedRatings },
        },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: { id: true, publicUrl: true, contentRating: true },
      },
      User: {
        select: {
          displayName: true,
          email: true,
        },
      },
      _count: {
        select: {
          conversations: true,
          assets: true,
        },
      },
    },
  });

  if (!companion) {
    const adultCompanion = await prisma.companion.findFirst({
      where: {
        slug,
        contentRating: ContentRating.ADULT,
        OR: [
          { visibility: Visibility.PUBLIC },
          ...(user ? [{ ownerId: user.id }] : []),
        ],
      },
      select: { slug: true },
    });

    if (adultCompanion) {
      const profilePath = `/companions/${adultCompanion.slug}`;
      if (user) {
        redirect(`/adult/verify?next=${encodeURIComponent(profilePath)}`);
      }
      redirect(`/login?next=${encodeURIComponent(profilePath)}`);
    }

    return <main className="p-6 text-zinc-400">Companion not found.</main>;
  }

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};
  const isOwner = Boolean(user && user.id === companion.ownerId);

  if (companion.ownerId && !companion.User && !isOwner) {
    redirect("/marketplace");
  }

  const creatorName =
    companion.User?.displayName ||
    companion.User?.email?.split("@")[0] ||
    (companion.ownerId ? "Creator" : "Noema");
  const assetUrl = (asset: (typeof companion.assets)[number]) =>
    asset.contentRating === ContentRating.ADULT
      ? `/media/${asset.id}`
      : (asset.publicUrl ?? `/media/${asset.id}`);
  const avatarImageUrl = profileText(profile, "avatarImageUrl") ?? null;
  const primaryUrl = companion.assets[0]
    ? assetUrl(companion.assets[0])
    : avatarImageUrl;
  const stats =
    profile.stats && typeof profile.stats === "object"
      ? Object.entries(profile.stats as Record<string, unknown>)
          .flatMap(([label, value]) =>
            typeof value === "number"
              ? ([[label, value]] as Array<[string, number]>)
              : [],
          )
          .slice(0, 6)
      : [];

  return (
    <CompanionProfileView
      companion={{
        slug: companion.slug,
        name: companion.name,
        description: companion.description,
        tags: companion.tags,
        contentRating: companion.contentRating,
        primaryUrl,
        creatorName,
        isOwner,
        views: companion.views,
        saves: companion.saves,
        chats: companion._count.conversations,
        media: companion._count.assets,
      }}
      profile={{
        scene:
          profileText(profile, "scene") ?? profileText(profile, "scenario"),
        personality: profileText(profile, "personality"),
        background: profileText(profile, "background"),
        speakingStyle:
          profileText(profile, "speakingStyle") ??
          profileText(profile, "speaking_style"),
        goals: profileText(profile, "goals"),
      }}
      stats={stats}
      assets={companion.assets.slice(1).map((asset) => ({
        id: asset.id,
        url: assetUrl(asset),
      }))}
    />
  );
}
