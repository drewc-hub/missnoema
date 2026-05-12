import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ContentRating,
  MarketplaceListingStatus,
  MarketplaceListingType,
  Visibility,
} from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const UpsertListingSchema = z.object({
  companionId: z.string().min(1),
});

function subtitleFrom(description: string) {
  const trimmed = description.trim();
  return trimmed.length > 140 ? `${trimmed.slice(0, 137)}...` : trimmed;
}

function statusFromVisibility(visibility: Visibility) {
  if (visibility === Visibility.PUBLIC) return MarketplaceListingStatus.PUBLISHED;
  if (visibility === Visibility.UNLISTED) return MarketplaceListingStatus.HIDDEN;
  return MarketplaceListingStatus.DRAFT;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20") || 20));

  const listings = await prisma.marketplaceListing.findMany({
    where: {
      listingType: MarketplaceListingType.COMPANION,
      status: MarketplaceListingStatus.PUBLISHED,
      contentRating: ContentRating.SAFE,
      companion: {
        is: {
          visibility: Visibility.PUBLIC,
          contentRating: ContentRating.SAFE,
        },
      },
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { subtitle: { contains: q, mode: "insensitive" as const } },
              { description: { contains: q, mode: "insensitive" as const } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: {
      id: true,
      title: true,
      subtitle: true,
      tags: true,
      contentRating: true,
      priceCoins: true,
      priceUsdCents: true,
      publishedAt: true,
      companion: {
        select: {
          slug: true,
          name: true,
          description: true,
          views: true,
          saves: true,
          likes: true,
          assets: {
            where: {
              type: "IMAGE",
              contentRating: ContentRating.SAFE,
            },
            orderBy: [{ isCover: "desc" }, { createdAt: "desc" }],
            take: 1,
            select: {
              id: true,
              publicUrl: true,
            },
          },
        },
      },
      creator: {
        select: {
          displayName: true,
          email: true,
        },
      },
    },
  });

  return NextResponse.json({ listings });
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.suspendedAt) return NextResponse.json({ error: "Account suspended." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = UpsertListingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", details: parsed.error.flatten() }, { status: 400 });
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: parsed.data.companionId,
      ownerId: user.id,
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      description: true,
      tags: true,
      contentRating: true,
      visibility: true,
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

  if (!companion) {
    return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  }

  const status = statusFromVisibility(companion.visibility);
  const cover = companion.assets.find((asset) => asset.contentRating === companion.contentRating);
  const listing = await prisma.marketplaceListing.upsert({
    where: {
      companionId: companion.id,
    },
    create: {
      listingType: MarketplaceListingType.COMPANION,
      status,
      creatorId: user.id,
      companionId: companion.id,
      title: companion.name,
      subtitle: subtitleFrom(companion.description),
      description: companion.description,
      tags: companion.tags,
      contentRating: companion.contentRating,
      priceCoins: 0,
      priceUsdCents: 0,
      coverAssetId: cover?.id ?? null,
      publishedAt: status === MarketplaceListingStatus.PUBLISHED ? new Date() : null,
    },
    update: {
      status,
      creatorId: user.id,
      title: companion.name,
      subtitle: subtitleFrom(companion.description),
      description: companion.description,
      tags: companion.tags,
      contentRating: companion.contentRating,
      coverAssetId: cover?.id ?? null,
      publishedAt: status === MarketplaceListingStatus.PUBLISHED ? new Date() : null,
    },
    select: {
      id: true,
      status: true,
      title: true,
      companion: {
        select: {
          slug: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, listing });
}
