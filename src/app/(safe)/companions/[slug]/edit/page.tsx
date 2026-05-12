import { redirect } from "next/navigation";
import { ContentRating } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { CompanionBuilder } from "@/components/CompanionBuilder";
import { MediaGenPanel } from "@/components/MediaGenPanel";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";

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
    },
  });

  if (!companion) {
    return <main className="p-6 text-zinc-400">Companion not found.</main>;
  }

  if (companion.contentRating === ContentRating.ADULT) {
    redirect(`/adult/companions/${slug}/edit`);
  }

  return (
    <main className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Edit companion</h1>
          <p className="text-sm text-zinc-400">
            Update the profile, visibility, and media for this marketplace companion.
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

      <div className="grid gap-5 lg:grid-cols-12">
        <section className="space-y-4 lg:col-span-7">
          <CompanionBuilder
            mode="edit"
            allowAdult={false}
            userEmail={user.email ?? null}
            companion={{
              id: companion.id,
              slug: companion.slug,
              name: companion.name,
              description: companion.description,
              tags: companion.tags,
              gender: companion.gender,
              archetype: companion.archetype ?? "",
              profile: companion.profile as any,
              contentRating: "SAFE",
              visibility: companion.visibility,
            }}
          />
        </section>

        <aside className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader
              title="Media generation"
              subtitle="Generate images and video for this companion."
            />
            <CardBody>
              <MediaGenPanel
                allowAdult={false}
                loggedIn={true}
                companionId={companion.id}
                contentRating="SAFE"
                defaultTag={companion.tags?.[0] ?? ""}
                redirectAfterGenerate={`/chat?companion=${companion.slug}`}
              />
            </CardBody>
          </Card>
        </aside>
      </div>
    </main>
  );
}
