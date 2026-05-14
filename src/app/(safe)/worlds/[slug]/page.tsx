import { notFound, redirect } from "next/navigation";
import { WorldRole } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";
import { DungeonEngineClient } from "@/components/DungeonEngineClient";
import { WorldJoinByCodeForm } from "@/components/WorldJoinByCodeForm";
import { WorldJoinButton } from "@/components/WorldJoinButton";

export default async function WorldRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getAuthedUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/worlds/${slug}`)}`);
  }

  const world = await prisma.world.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      summary: true,
      setting: true,
      isPublic: true,
      maxMembers: true,
      createdAt: true,
      lastActivityAt: true,
      ownerId: true,
      owner: {
        select: {
          displayName: true,
          email: true,
        },
      },
      members: {
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        select: {
          userId: true,
          role: true,
          displayName: true,
          user: {
            select: {
              displayName: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
          messages: true,
        },
      },
    },
  });

  if (!world) notFound();

  const myMembership = world.members.find((m) => m.userId === user.id) ?? null;
  const isMember = !!myMembership;
  const isHost = world.ownerId === user.id || myMembership?.role === WorldRole.HOST;
  if (!world.isPublic && !isMember) {
    return (
      <main className="space-y-4 rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-zinc-100">
        <h1 className="text-2xl font-semibold text-white">Private world</h1>
        <p className="text-sm text-zinc-400">You need an invite from the host to access this room.</p>
        <WorldJoinByCodeForm />
      </main>
    );
  }

  const eligible = isRpWorldEligible(user.plan);
  const canJoin = eligible && world.isPublic && !isMember && world._count.members < world.maxMembers;
  const canPost = eligible && isMember;
  const canManageRoles = eligible && isHost;

  const initialMessages = isMember
    ? await prisma.worldMessage.findMany({
        where: { worldId: world.id },
        orderBy: { createdAt: "asc" },
        take: 120,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
          authorUser: {
            select: {
              id: true,
              displayName: true,
              email: true,
            },
          },
        },
      })
    : [];
  const invites = isHost
    ? await prisma.worldInvite.findMany({
        where: { worldId: world.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          code: true,
          maxUses: true,
          usedCount: true,
          expiresAt: true,
          revokedAt: true,
          createdAt: true,
        },
      })
    : [];

  return (
    <main className="space-y-5 text-zinc-100">
      {!eligible ? (
        <section className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-100">
          Multiplayer posting requires PRO or UNLIMITED.
          <a href="/account/billing" className="ml-2 font-semibold text-white underline">
            Upgrade plan
          </a>
        </section>
      ) : null}

      {canJoin ? (
        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <WorldJoinButton worldId={world.id} />
        </section>
      ) : null}

      <DungeonEngineClient
        world={{
          id: world.id,
          slug: world.slug,
          name: world.name,
          summary: world.summary,
          setting: world.setting,
          isPublic: world.isPublic,
          maxMembers: world.maxMembers,
          lastActivityAt: world.lastActivityAt,
          ownerId: world.ownerId,
          ownerName: world.owner.displayName || world.owner.email?.split("@")[0] || "Creator",
          plan: user.plan,
          messageCount: world._count.messages,
          memberCount: world._count.members,
        }}
        members={world.members}
        initialMessages={initialMessages}
        canPost={canPost}
        canManageRoles={canManageRoles}
        isHost={isHost}
        meUserId={user.id}
        initialInvites={invites}
      />
    </main>
  );
}
