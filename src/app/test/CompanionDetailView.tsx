// file: src/components/CompanionDetailView.tsx
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed, requireAdultAllowed } from "@/lib/ratings";
import { ContentRating, Visibility } from "@/lib/db";
import { Badge, Card, CardBody, CardHeader, Button } from "@/components/ui";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";

type Asset = {
  id: string;
  type: "IMAGE" | "VIDEO";
  publicUrl: string | null;
  contentRating: ContentRating;
  storagePath: string | null;
};

export async function CompanionDetailView({
  slug,
  forceAdult,
}: {
  slug: string;
  forceAdult?: boolean;
}) {
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);

  // If this is the adult route, require verification.
  if (forceAdult) requireAdultAllowed(user);

  const allowedRatings: ContentRating[] = [ContentRating.SAFE];
  if (allowAdult) allowedRatings.push(ContentRating.ADULT);

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
      assets: {
        where: {
          contentRating: forceAdult
            ? ContentRating.ADULT
            : { in: allowedRatings },
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          type: true,
          publicUrl: true,
          contentRating: true,
          storagePath: true,
        },
      },
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

  // If an adult companion leaks into normal route, enforce DB gating.
  if (companion.contentRating === ContentRating.ADULT)
    requireAdultAllowed(user);

  const srcFor = (a: Asset) => a.publicUrl ?? `/media/${a.id}`;

  // Video poster selection (best-effort)
  const imageAssets = (companion.assets as Asset[]).filter(
    (a) => a.type === "IMAGE",
  );
  const posterCandidates = imageAssets.filter((a) =>
    (a.storagePath ?? "").includes("poster"),
  );
  const fallbackPoster = posterCandidates[0] ?? imageAssets[0] ?? null;

  // Hero cover uses latest IMAGE
  const coverAsset = imageAssets[0] ?? null;
  const coverUrl = coverAsset ? srcFor(coverAsset) : null;

  const videoEnabled = process.env.VIDEO_ENABLED === "1";

  return (
    <main className="space-y-6">
      {/* Hero */}
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
          <Badge tone={companion.contentRating === "ADULT" ? "adult" : "safe"}>
            {companion.contentRating}
          </Badge>
          {forceAdult ? <Badge>Adult library</Badge> : null}
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

      {/* Two-column layout */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section className="lg:col-span-7 space-y-4">
          <CompanionBuilder
            userEmail={user?.email ?? null}
            allowAdult={allowAdult}
            companion={companion as any}
          />

          <Card>
            <CardHeader
              title="Media feed"
              subtitle="Recent assets (SAFE or ADULT depending on route)."
            />
            <CardBody>
              {companion.assets.length ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {(companion.assets as Asset[]).slice(0, 6).map((a) => (
                    <div
                      key={a.id}
                      className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950"
                    >
                      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">
                        <span>{a.type}</span>
                        <Badge
                          tone={a.contentRating === "ADULT" ? "adult" : "safe"}
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
