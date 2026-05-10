import React from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { MediaGenPanel } from "@/components/MediaGenPanel";
import { Badge } from "@/components/ui";

export default async function SafeCustomizePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const user = await getAuthedUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/companions/${slug}/customize`)}`);
  }

  const companion = await prisma.companion.findFirst({
    where: { slug, visibility: "PUBLIC" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      gender: true,
      age: true,
      tags: true,
      contentRating: true,
      assets: {
        where: { type: "IMAGE", contentRating: "SAFE" },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, publicUrl: true },
      },
    },
  });

  if (!companion) {
    return <main className="p-6 text-zinc-400">Companion not found.</main>;
  }

  return (
    <main className="space-y-5">
      <div className="flex items-center gap-3">
        <a href="/companions/media" className="text-zinc-500 hover:text-zinc-300 text-sm">← Back</a>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">{companion.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            {companion.gender && <Badge tone="safe">{companion.gender}</Badge>}
            {companion.age != null && <span className="text-xs text-zinc-500">Age {companion.age}</span>}
          </div>
        </div>
        <a href={`/chat?companion=${companion.slug}`} className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors">
          Chat
        </a>
      </div>

      <p className="text-sm text-zinc-400">{companion.description}</p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generation panel */}
        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Generate a photo</h2>
          <MediaGenPanel
            allowAdult={false}
            loggedIn={true}
            companionId={companion.id}
            contentRating="SAFE"
          />
        </div>

        {/* Existing assets */}
        {companion.assets.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-medium text-zinc-300">Generated photos</h2>
            <div className="grid grid-cols-2 gap-3">
              {companion.assets.map((a) => (
                <div key={a.id} className="overflow-hidden rounded-xl border border-zinc-800 aspect-[3/4] bg-zinc-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.publicUrl ?? `/media/${a.id}`} alt="" className="h-full w-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
