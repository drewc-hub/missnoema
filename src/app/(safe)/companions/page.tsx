
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed, requireAdultAllowed } from "@/lib/ratings";
import { listCompanions } from "@/CompanionDetailView";
import { Card, CardBody, CardHeader, Input, Button, Badge } from "@/components/ui";
import { ContentRating } from "@prisma/client";

type SearchParams = { category?: string };

export default async function CompanionDetailPage({
    params,
    searchParams
}: {
    params: Promise<{ slug: string }>;
    searchParams: Promise<SearchParams>;
}) {
    const { slug } = await params;
    const sp = await searchParams;

    const user = await getAuthedUser();
    const allowAdult = isAdultAllowed(user);

    const allowedRatings: ContentRating[] = [ContentRating.SAFE];
    if (allowAdult) allowedRatings.push(ContentRating.ADULT);

    // Optional: allow filtering the companion list by category via query param.
    // Usually this belongs on /companions (library), not here.
    const category = (sp.category ?? "").trim();

    const where: any = {
        slug,
        visibility: "PUBLIC",
        contentRating: { in: allowedRatings }
    };

    if (category) {
        where.categories = {
            some: { category: { slug: category } }
        };
    }

    const companion = await prisma.companion.findFirst({
        where,
        select: {
            id: true,
            ownerId: true,
            name: true,
            slug: true,
            description: true,
            tags: true,
            profile: true,
            contentRating: true,
            assets: {
                where: { contentRating: { in: allowedRatings } },
                orderBy: { createdAt: "desc" },
                select: { id: true, type: true, contentRating: true }
            }
        }
    });

    if (!companion) {
        return (
            <main>
                <h1 className="text-2xl font-semibold">Not found</h1>
            </main>
        );
    }

    if (companion.contentRating === "ADULT") requireAdultAllowed(user);

    const coverAssetId = companion.assets.find((a) => a.type === "IMAGE")?.id ?? null;

    return (
        <main className="space-y-5">
            {coverAssetId ? (
                <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/media/${coverAssetId}`} alt={`${companion.name} cover`} className="h-[260px] w-full object-cover" />
                </div>
            ) : (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-sm text-zinc-500">
                    No cover image yet — upload one in Admin or generate one.
                </div>
            )}

            <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-semibold tracking-tight">{companion.name}</h1>
                    <Badge tone={companion.contentRating === "ADULT" ? "adult" : "safe"}>{companion.contentRating}</Badge>
                </div>
                <p className="max-w-3xl text-zinc-300">{companion.description}</p>
                <div className="flex flex-wrap gap-2">
                    {companion.tags.map((t) => (
                        <span key={t} className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300 ring-1 ring-zinc-800">
                            {t}
                        </span>
                    ))}
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-4">
                    <Card>
                        <CardHeader title="Media" subtitle="Assets are served via /media/<assetId>." />
                        <CardBody>
                            {companion.assets.length ? (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    {companion.assets.map((a) => (
                                        <div key={a.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
                                            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2 text-xs text-zinc-400">
                                                <span>{a.type}</span>
                                                <Badge tone={a.contentRating === "ADULT" ? "adult" : "safe"}>{a.contentRating}</Badge>
                                            </div>
                                            {a.type === "IMAGE" ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={`/media/${a.id}`} alt="asset" className="h-auto w-full" />
                                            ) : (
                                                <video controls src={`/media/${a.id}`} className="h-auto w-full" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-sm text-zinc-500">No media yet. Queue an image/video on the right.</div>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Profile" subtitle="Stored JSON (upgrade to a form UI later)." />
                        <CardBody>
                            <pre className="max-h-[420px] overflow-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-200 ring-1 ring-zinc-800">
                                {JSON.stringify(companion.profile, null, 2)}
                            </pre>
                        </CardBody>
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card>
                        <CardHeader
                            title="Generate"
                            subtitle={user ? "Queues jobs for the worker to process." : "Login required to generate."}
                            right={user ? <Badge tone="safe">Logged in</Badge> : <Badge>Guest</Badge>}
                        />
                        <CardBody className="space-y-4">
                            {!user ? (
                                <a href="/login">
                                    <Button className="w-full">Login to generate</Button>
                                </a>
                            ) : (
                                <>
                                    <form action="/api/generate/image" method="post" className="space-y-2">
                                        <input type="hidden" name="companionId" value={companion.id} />
                                        <input type="hidden" name="contentRating" value={companion.contentRating} />
                                        <div className="text-xs text-zinc-400">Image prompt</div>
                                        <Input name="prompt" placeholder="Portrait, soft lighting, clean background..." required />
                                        <Button type="submit" className="w-full">Queue image</Button>
                                    </form>

                                    <form action="/api/generate/video" method="post" className="space-y-2">
                                        <input type="hidden" name="companionId" value={companion.id} />
                                        <input type="hidden" name="contentRating" value={companion.contentRating} />
                                        <div className="text-xs text-zinc-400">Video prompt</div>
                                        <Input name="prompt" placeholder="5s intro clip, cinematic, friendly..." required />
                                        <Button type="submit" variant="secondary" className="w-full">Queue video</Button>
                                    </form>

                                    <div className="text-xs text-zinc-500">
                                        If video isn’t enabled on your OpenAI account, video jobs will fail (safe).
                                    </div>
                                </>
                            )}
                        </CardBody>
                    </Card>

                    <Card>
                        <CardHeader title="Quick actions" />
                        <CardBody className="space-y-2">
                            <a href="/companions">
                                <Button variant="ghost" className="w-full">Back to library</Button>
                            </a>
                            <a href={`/companions/${companion.slug}/edit`}>
                                <Button variant="secondary" className="w-full">Edit companion</Button>
                            </a>
                        </CardBody>
                    </Card>
                </div>
            </div>
        </main>
    );
}
