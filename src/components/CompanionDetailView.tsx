// file: src/components/CompanionDetailView.tsx
import React from "react";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating, Visibility } from "@prisma/client";
import { Badge, Card, CardBody, CardHeader, Button } from "@/components/ui";
import {
    CompanionBuilder,
    type CompanionShape,
} from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";

type Asset = {
    id: string;
    type: "IMAGE" | "VIDEO";
    publicUrl: string | null;
    contentRating: ContentRating;
    storagePath: string | null;
    createdAt?: Date;
};

type GateMode = "login" | "verify";

function qp(params: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
        if (v != null && v !== "") p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
}

function AccessCard({
    mode,
    nextUrl,
}: {
    mode: GateMode;
    nextUrl: string;
}) {
    if (mode === "login") {
        return (
            <main className="mx-auto max-w-2xl space-y-4">
                <Card>
                    <CardHeader
                        title="Login required"
                        subtitle="Please login to access the mature library."
                        right={<Badge>Web-only</Badge>}
                    />
                    <CardBody className="space-y-3">
                        <a href={`/login?next=${encodeURIComponent(nextUrl)}`}>
                            <Button className="w-full">Login</Button>
                        </a>
                        <a href="/companions">
                            <Button variant="secondary" className="w-full">
                                Back to SAFE library
                            </Button>
                        </a>
                    </CardBody>
                </Card>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-2xl space-y-4">
            <Card>
                <CardHeader
                    title="Adult content is locked"
                    subtitle="Web-only 18+ content requires age verification."
                    right={<Badge>Web-only</Badge>}
                />
                <CardBody className="space-y-4 text-sm text-zinc-300">
                    <p>
                        SAFE content is the default experience. To access the adult library,
                        confirm you’re 18+.
                    </p>
                    <form
                        action={`/api/age/verify?next=${encodeURIComponent(nextUrl)}`}
                        method="post"
                        className="space-y-3"
                    >
                        <label className="flex items-start gap-3 text-sm">
                            <input
                                required
                                name="confirm"
                                value="1"
                                type="checkbox"
                                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                            />
                            <span>I confirm I am 18 years of age or older.</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            <Button type="submit">Verify & Continue</Button>
                            <a href="/companions">
                                <Button type="button" variant="secondary">
                                    Back to SAFE library
                                </Button>
                            </a>
                        </div>
                    </form>
                </CardBody>
            </Card>
        </main>
    );
}

export async function CompanionDetailView({
    slug,
    forceAdult,
    mediaPage = 1,
    matureBasePath = "/public", // change to "/adult" if needed
}: {
    slug: string;
    forceAdult?: boolean;
    mediaPage?: number;
    matureBasePath?: "/adult" | "/public";
}) {
    const user = await getAuthedUser();
    const allowAdult = isAdultAllowed(user);

    const matureCompanionUrl = `${matureBasePath}/companions/${slug}`;

    // Route-level gate when viewing mature route
    if (forceAdult) {
        if (!user) return <AccessCard mode="login" nextUrl={matureCompanionUrl} />;
        if (!allowAdult)
            return <AccessCard mode="verify" nextUrl={matureCompanionUrl} />;
    }

    const allowedRatings: ContentRating[] =
        forceAdult || allowAdult
            ? [ContentRating.SAFE, ContentRating.ADULT]
            : [ContentRating.SAFE];

    const companion = await prisma.companion.findFirst({
        where: {
            slug,
            visibility: Visibility.PUBLIC,
            contentRating: forceAdult ? ContentRating.ADULT : { in: allowedRatings },
        },
        select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            tags: true,
            profile: true,
            contentRating: true,
        },
    });

    if (!companion) {
        return (
            <main className="space-y-3">
                <h1 className="text-2xl font-semibold">Not found</h1>
                <p className="text-sm text-zinc-400">
                    This companion may be private or not available.
                </p>
                <a href="/companions">
                    <Button variant="secondary">Back</Button>
                </a>
            </main>
        );
    }

    // If ADULT companion opened via SAFE route, gate gracefully
    if (!forceAdult && companion.contentRating === ContentRating.ADULT) {
        if (!user) return <AccessCard mode="login" nextUrl={matureCompanionUrl} />;
        if (!allowAdult)
            return <AccessCard mode="verify" nextUrl={matureCompanionUrl} />;
    }

    const pageSize = 8;
    const page = Math.max(1, mediaPage);
    const skip = (page - 1) * pageSize;

    const assetWhere = {
        companionId: companion.id,
        contentRating: forceAdult ? ContentRating.ADULT : { in: allowedRatings },
    };

    const [assetsTotal, assets] = await Promise.all([
        prisma.companionAsset.count({ where: assetWhere }),
        prisma.companionAsset.findMany({
            where: assetWhere,
            orderBy: { createdAt: "desc" },
            skip,
            take: pageSize,
            select: {
                id: true,
                type: true,
                publicUrl: true,
                contentRating: true,
                storagePath: true,
                createdAt: true,
            },
        }),
    ]);

    const totalPages = Math.max(1, Math.ceil(assetsTotal / pageSize));
    const srcFor = (a: Asset) => a.publicUrl ?? `/media/${a.id}`;

    const typedAssets = assets as Asset[];
    const imageAssets = typedAssets.filter((a) => a.type === "IMAGE");
    const posterCandidates = imageAssets.filter((a) =>
        (a.storagePath ?? "").includes("poster"),
    );
    const fallbackPoster = posterCandidates[0] ?? imageAssets[0] ?? null;

    const coverAsset =
        imageAssets[0] ??
        (await prisma.companionAsset.findFirst({
            where: {
                companionId: companion.id,
                type: "IMAGE",
                contentRating: forceAdult
                    ? ContentRating.ADULT
                    : { in: allowedRatings },
            },
            orderBy: { createdAt: "desc" },
            select: { id: true, publicUrl: true },
        }));

    const coverUrl = coverAsset
        ? (coverAsset.publicUrl ?? `/media/${coverAsset.id}`)
        : null;

    const videoEnabled = process.env.VIDEO_ENABLED === "1";

    const builderCompanion: CompanionShape = {
        id: companion.id,
        name: companion.name,
        description: companion.description,
        tags: companion.tags,
        contentRating: companion.contentRating as any,
        profile: companion.profile,
    };

    const basePath = forceAdult
        ? `${matureBasePath}/companions/${companion.slug}`
        : `/companions/${companion.slug}`;

    return (
        <main className="space-y-6">
            {coverUrl ? (
                <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={coverUrl}
                        alt={`${companion.name} cover`}
                        className="h-[240px] w-full object-cover"
                    />
                </div>
            ) : (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-sm text-zinc-500">
                    No cover image yet — generate one on the right.
                </div>
            )}

            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        {companion.name}
                    </h1>
                    <Badge
                        tone={
                            companion.contentRating === ContentRating.ADULT ? "adult" : "safe"
                        }
                    >
                        {companion.contentRating}
                    </Badge>
                    {forceAdult ? <Badge tone="adult">Adult library</Badge> : null}
                </div>
                <p className="max-w-3xl text-zinc-300">{companion.description}</p>
                <div className="flex flex-wrap gap-2">
                    {companion.tags.map((t) => (
                        <span
                            key={t}
                            className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800"
                        >
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-12">
                <section className="space-y-4 lg:col-span-7">
                    <CompanionBuilder
                        userEmail={user?.email ?? null}
                        allowAdult={allowAdult}
                        companion={builderCompanion}
                    />

                    <Card>
                        <CardHeader
                            title="Media feed"
                            subtitle={`Page ${page} of ${totalPages}`}
                        />
                        <CardBody className="space-y-4">
                            {typedAssets.length ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {typedAssets.map((a) => (
                                        <div
                                            key={a.id}
                                            className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                                        >
                                            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">
                                                <span>{a.type}</span>
                                                <Badge
                                                    tone={
                                                        a.contentRating === ContentRating.ADULT
                                                            ? "adult"
                                                            : "safe"
                                                    }
                                                >
                                                    {a.contentRating}
                                                </Badge>
                                            </div>

                                            {a.type === "IMAGE" ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={srcFor(a)}
                                                    alt="asset"
                                                    className="h-auto w-full"
                                                />
                                            ) : (
                                                <video
                                                    controls
                                                    preload="metadata"
                                                    poster={
                                                        fallbackPoster ? srcFor(fallbackPoster) : undefined
                                                    }
                                                    src={srcFor(a)}
                                                    className="h-auto w-full"
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-zinc-500">No media yet.</div>
                            )}

                            <div className="flex items-center justify-between gap-3">
                                <div className="text-sm text-zinc-500">
                                    Showing <span className="text-zinc-200">{typedAssets.length}</span>{" "}
                                    of <span className="text-zinc-200">{assetsTotal}</span>
                                </div>

                                <div className="flex gap-2">
                                    <a
                                        className={page <= 1 ? "pointer-events-none opacity-40" : ""}
                                        href={`${basePath}${qp({ mediaPage: String(page - 1) })}`}
                                    >
                                        <Button variant="secondary">Prev</Button>
                                    </a>
                                    <a
                                        className={
                                            page >= totalPages ? "pointer-events-none opacity-40" : ""
                                        }
                                        href={`${basePath}${qp({ mediaPage: String(page + 1) })}`}
                                    >
                                        <Button variant="secondary">Next</Button>
                                    </a>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </section>

                <aside className="lg:col-span-5">
                    <MediaGenPanel
                        loggedIn={!!user}
                        allowAdult={allowAdult}
                        companionId={companion.id}
                        contentRating={companion.contentRating as any}
                        defaultTag={companion.tags?.[0] ?? ""}
                        videoEnabled={videoEnabled}
                    />
                </aside>
            </div>
        </main>
    );
}
