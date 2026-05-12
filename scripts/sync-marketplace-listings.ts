import {
  ContentRating,
  MarketplaceListingStatus,
  MarketplaceListingType,
  PrismaClient,
  Visibility,
} from "@prisma/client";

const prisma = new PrismaClient();

function subtitleFrom(description: string) {
  const trimmed = description.trim();
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

async function main() {
  const companions = await prisma.companion.findMany({
    where: {
      visibility: Visibility.PUBLIC,
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      description: true,
      tags: true,
      contentRating: true,
      updatedAt: true,
      assets: {
        where: {
          type: "IMAGE",
        },
        orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
        take: 1,
        select: {
          id: true,
          contentRating: true,
        },
      },
    },
  });

  let synced = 0;

  for (const companion of companions) {
    const cover = companion.assets.find((asset) => asset.contentRating === companion.contentRating);

    await prisma.marketplaceListing.upsert({
      where: {
        companionId: companion.id,
      },
      create: {
        listingType: MarketplaceListingType.COMPANION,
        status: MarketplaceListingStatus.PUBLISHED,
        creatorId: companion.ownerId,
        companionId: companion.id,
        title: companion.name,
        subtitle: subtitleFrom(companion.description),
        description: companion.description,
        tags: companion.tags,
        contentRating: companion.contentRating,
        priceCoins: 0,
        priceUsdCents: 0,
        coverAssetId: cover?.id ?? null,
        publishedAt: companion.updatedAt,
      },
      update: {
        status: MarketplaceListingStatus.PUBLISHED,
        creatorId: companion.ownerId,
        title: companion.name,
        subtitle: subtitleFrom(companion.description),
        description: companion.description,
        tags: companion.tags,
        contentRating: companion.contentRating,
        priceCoins: 0,
        priceUsdCents: 0,
        coverAssetId: cover?.id ?? null,
        publishedAt: companion.updatedAt,
      },
    });

    synced += 1;
  }

  const safePublished = await prisma.marketplaceListing.count({
    where: {
      listingType: MarketplaceListingType.COMPANION,
      status: MarketplaceListingStatus.PUBLISHED,
      contentRating: ContentRating.SAFE,
    },
  });

  console.log(`Synced ${synced} public companions into marketplace listings.`);
  console.log(`Published SAFE companion listings: ${safePublished}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
