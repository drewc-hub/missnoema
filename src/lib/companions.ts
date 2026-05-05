// file: src/lib/companions.ts
import "server-only";

import { prisma } from "@/lib/prisma";
import { ContentRating, Visibility } from "@prisma/client";
import { parseCsv } from "@/lib/validate";
import { isAdultAllowed } from "@/lib/ratings";

type AuthedUser = {
    id: string;
    email?: string | null;
    ageVerifiedAt?: Date | string | null;
} | null;

export type ListCompanionsInput = {
    user: AuthedUser;
    q?: string;
    tags?: string;
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
        tags: string[];
        contentRating: "SAFE" | "ADULT";
        featuredRank: number | null;
        thumbnailUrl: string | null;
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

export async function listCompanions({
    user,
    q = "",
    tags = "",
    page = 1,
    pageSize = 12,
    includeAdult = false,
}: ListCompanionsInput): Promise<ListCompanionsResult> {

    const safePage = Math.max(1, Number(page) || 1);
    const safePageSize = Math.min(30, Math.max(1, Number(pageSize) || 12));
    const skip = (safePage - 1) * safePageSize;

    const allowedRatings: ContentRating[] = [ContentRating.SAFE];

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
        ],
    };

    const [total, rows] = await Promise.all([
        prisma.companion.count({ where }),
        prisma.companion.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip,
            take: safePageSize,
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                tags: true,
                contentRating: true,
                featuredRank: true,
                assets: {
                    where: {
                        type: "IMAGE",
                        contentRating: { in: allowedRatings },
                    },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { id: true, publicUrl: true },
                },
            },
        }),
    ]);

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

        return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
            tags: c.tags,
            contentRating: c.contentRating,
            featuredRank: c.featuredRank ?? null,
            thumbnailUrl: asset ? (asset.publicUrl ?? `/media/${asset.id}`) : null,
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
