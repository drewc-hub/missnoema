// file: src/components/CompanionEditLayout.tsx
"use client";

import React, { useState } from "react";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";
import { MarketplaceListingPanel } from "@/components/MarketplaceListingPanel";
import { Card, CardBody, CardHeader } from "@/components/ui";

type Visibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
type ContentRating = "SAFE" | "ADULT";

type CompanionEditLayoutProps = {
    companion: {
        id: string;
        slug: string;
        name: string;
        description: string;
        tags: string[];
        gender: string | null;
        archetype: string | null;
        profile: Record<string, unknown> | null;
        contentRating: ContentRating;
        visibility: Visibility;
        assets: { id: string }[];
        listing: {
            id: string;
            status: string;
            priceCoins: number;
            priceUsdCents: number;
            updatedAt: string;
            publishedAt: string | null;
        } | null;
    };
    allowAdult: boolean;
    userEmail: string | null;
};

export function CompanionEditLayout({ companion, allowAdult, userEmail }: CompanionEditLayoutProps) {
    const [showAside, setShowAside] = useState(true);
    const [fullPage, setFullPage] = useState(false);

    const isSafe = companion.contentRating === "SAFE";
    const chatHref = isSafe
        ? `/chat?companion=${companion.slug}`
        : `/adult/chat?companion=${companion.slug}`;

    const listing = companion.listing
        ? {
              id: companion.listing.id,
              status: companion.listing.status as any,
              priceCoins: companion.listing.priceCoins,
              priceUsdCents: companion.listing.priceUsdCents,
              updatedAt: new Date(companion.listing.updatedAt),
              publishedAt: companion.listing.publishedAt ? new Date(companion.listing.publishedAt) : null,
          }
        : null;

    return (
        <div className={`grid gap-5 ${!fullPage && showAside ? "lg:grid-cols-12" : ""}`}>
            <section className={`space-y-4 ${!fullPage && showAside ? "lg:col-span-7" : ""}`}>
                <CompanionBuilder
                    mode="edit"
                    allowAdult={allowAdult}
                    userEmail={userEmail}
                    companion={{
                        id: companion.id,
                        slug: companion.slug,
                        name: companion.name,
                        description: companion.description,
                        tags: companion.tags,
                        gender: companion.gender,
                        archetype: companion.archetype,
                        profile: companion.profile as any,
                        contentRating: companion.contentRating,
                        visibility: companion.visibility,
                    }}
                    onGenerated={() => {
                        setShowAside(true);
                        setFullPage(false);
                    }}
                    fullPageMode={fullPage}
                    onToggleFullPage={() => {
                        setFullPage((p) => !p);
                        if (!fullPage) setShowAside(false);
                        else setShowAside(true);
                    }}
                />
            </section>

            {!fullPage && showAside && (
                <aside className="space-y-4 lg:col-span-5" id="media-panel">
                    <MarketplaceListingPanel
                        companion={{
                            id: companion.id,
                            slug: companion.slug,
                            description: companion.description,
                            tags: companion.tags,
                            profile: companion.profile,
                            assets: companion.assets,
                            visibility: companion.visibility as any,
                            contentRating: companion.contentRating as any,
                        }}
                        listing={listing}
                    />

                    <Card>
                        <CardHeader
                            title="Media generation"
                            subtitle={isSafe ? "Generate images for this companion." : "Generate images for this adult companion."}
                        />
                        <CardBody>
                            <MediaGenPanel
                                allowAdult={allowAdult}
                                loggedIn={true}
                                companionId={companion.id}
                                contentRating={companion.contentRating as any}
                                defaultTag={companion.tags?.[0] ?? ""}
                                redirectAfterGenerate={chatHref}
                            />
                        </CardBody>
                    </Card>
                </aside>
            )}
        </div>
    );
}
