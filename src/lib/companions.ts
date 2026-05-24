// file: src/lib/companions.ts
import "server-only";

import { prisma } from "@/lib/prisma";
import { ContentRating, Visibility } from "@prisma/client";
import { parseCsv } from "@/lib/validate";
import { isAdultAllowed } from "@/lib/ratings";
import { PremiumFeature, hasUserFeature, isPremiumOnlyProfile } from "@/lib/premium";

type AuthedUser = {
    id: string;
    email?: string | null;
    ageVerifiedAt?: Date | string | null;
} | null;

export type ListCompanionsInput = {
    user: AuthedUser;
    q?: string;
    tags?: string;
    gender?: string;
    minAge?: number;
    maxAge?: number;
    hasPhoto?: boolean;
    page?: number;
    pageSize?: number;
    includeAdult?: boolean;
};

export type ListCompanionsResult = {
    items: Array<{
        id: string;
        name: string;
        slug: string;
        description: string;
        gender: string | null;
        age: number | null;
        tags: string[];
        contentRating: "SAFE" | "ADULT";
        featuredRank: number | null;
        thumbnailUrl: string | null;
        focalX: number;
        focalY: number;
        imagesCount: number;
        videosCount: number;
    }>;
    page: number;
    pageSize: number;
    total: number;
};

export class AdultVerificationRequiredError extends Error {
    constructor(message = "Age verification required.") {
        super(message);
        this.name = "AdultVerificationRequiredError";
    }
}

function hasProfileAvatar(profile: unknown) {
    return (
        !!profile &&
        typeof profile === "object" &&
        typeof (profile as Record<string, unknown>).avatarImageUrl === "string" &&
        String((profile as Record<string, unknown>).avatarImageUrl).trim().length > 0
    );
}

export async function listCompanions({
    user,
    q = "",
    tags = "",
    gender,
    minAge,
    maxAge,
    hasPhoto,
    page = 1,
    pageSize = 12,
    includeAdult = false,
}: ListCompanionsInput): Promise<ListCompanionsResult> {

    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(30, Math.max(1, Number(pageSize) || 12));
    const skip = (safePage - 1) * safePageSize;

    const allowedRatings: ContentRating[] = [ContentRating.SAFE];
    const hasPremiumCompanions = user
        ? await hasUserFeature(user.id, PremiumFeature.PREMIUM_COMPANIONS)
        : false;

    if (includeAdult) {
        if (!isAdultAllowed(user)) {
            throw new AdultVerificationRequiredError();
        }
        allowedRatings.push(ContentRating.ADULT);
    }

    const tagList = parseCsv(tags.trim());
    const query = q.trim();

    const where = {
        AND: [
            { visibility: Visibility.PUBLIC },
            { contentRating: { in: allowedRatings } },
            query
                ? {
                    OR: [
                        { name: { contains: query, mode: "insensitive" as const } },
                        {
                            description: { contains: query, mode: "insensitive" as const },
                        },
                        { slug: { contains: query, mode: "insensitive" as const } },
                    ],
                }
                : {},
            tagList.length ? { tags: { hasEvery: tagList } } : {},
            gender ? { gender: { equals: gender, mode: "insensitive" as const } } : {},
            minAge != null ? { age: { gte: minAge } } : {},
            maxAge != null ? { age: { lte: maxAge } } : {},
        ],
    };

    const allRows = await prisma.companion.findMany({
            where,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                tags: true,
                gender: true,
                age: true,
                contentRating: true,
                featuredRank: true,
                profile: true,
                assets: {
                    where: {
                        type: "IMAGE",
                        contentRating: { in: allowedRatings },
                    },
                    // ADULT sorts before SAFE alphabetically ("A" < "S"), so asc
                    // puts the adult cover first when includeAdult is true.
                    orderBy: [
                        { contentRating: "asc" },
                        { createdAt: "desc" },
                    ],
                    take: 1,
                    select: { id: true, publicUrl: true, contentRating: true, metadata: true },
                },
            },
        });

    const entitlementVisibleRows = hasPremiumCompanions
        ? allRows
        : allRows.filter((companion) => !isPremiumOnlyProfile(companion.profile));
    const visibleRows = entitlementVisibleRows.filter((companion) => {
        if (hasPhoto == null) return true;
        const hasAsset = companion.assets.length > 0;
        const hasAvatar = hasProfileAvatar(companion.profile);
        const hasAnyPhoto = hasAsset || hasAvatar;
        return hasPhoto ? hasAnyPhoto : !hasAnyPhoto;
    });
    const total = visibleRows.length;
    const rows = visibleRows.slice(skip, skip + safePageSize);

    const ids = rows.map((c) => c.id);

    const grouped =
        ids.length > 0
            ? await prisma.companionAsset.groupBy({
                by: ["companionId", "type"],
                where: {
                    companionId: { in: ids },
                    contentRating: { in: allowedRatings },
                },
                _count: { _all: true },
            })
            : [];

    const countsBy = new Map<string, { images: number; videos: number }>();

    for (const row of grouped) {
        const current = countsBy.get(row.companionId) ?? { images: 0, videos: 0 };
        if (row.type === "IMAGE") current.images = row._count._all;
        if (row.type === "VIDEO") current.videos = row._count._all;
        countsBy.set(row.companionId, current);
    }

    const items = rows.map((c) => {
        const counts = countsBy.get(c.id) ?? { images: 0, videos: 0 };
        const asset = c.assets[0];
        const avatarFromProfile =
            c.profile && typeof c.profile === "object" && typeof (c.profile as Record<string, unknown>).avatarImageUrl === "string"
                ? String((c.profile as Record<string, unknown>).avatarImageUrl)
                : null;

        return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            gender: c.gender ?? null,
            age: c.age ?? null,
            tags: c.tags,
            contentRating: c.contentRating,
            featuredRank: c.featuredRank ?? null,
            thumbnailUrl: asset
                ? asset.contentRating === ContentRating.ADULT
                    ? `/media/${asset.id}`
                    : (asset.publicUrl ?? `/media/${asset.id}`)
                : avatarFromProfile,
            focalX: asset ? ((asset.metadata as Record<string, unknown>)?.focalX as number | undefined) ?? 50 : 50,
            focalY: asset ? ((asset.metadata as Record<string, unknown>)?.focalY as number | undefined) ?? 5 : 5,
            imagesCount: counts.images,
            videosCount: counts.videos,
        };
    });

    return {
        items,
        page: safePage,
        pageSize: safePageSize,
        total,
    };
}
