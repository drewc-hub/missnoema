import { notFound, redirect } from "next/navigation";
import { Crown, Globe2, Lock, Shield, Users } from "lucide-react";
import { WorldRole } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";
import { WorldInviteManager } from "@/components/WorldInviteManager";
import { WorldJoinByCodeForm } from "@/components/WorldJoinByCodeForm";
import { WorldJoinButton } from "@/components/WorldJoinButton";
import { WorldRoomClient } from "@/components/WorldRoomClient";
import { WorldMemberRoleControl } from "@/components/WorldMemberRoleControl";
import { WorldFactionPanel } from "@/components/WorldFactionPanel";

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
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">{world.name}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">{world.summary}</p>
            {world.setting ? (
              <div className="mt-3 rounded-lg border border-zinc-800 bg-black p-3 text-sm text-zinc-300">
                {world.setting}
              </div>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-black px-2.5 py-1">
              {world.isPublic ? <Globe2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              {world.isPublic ? "Public" : "Private"}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-black px-2.5 py-1">
              <Users className="h-3.5 w-3.5" />
              {world._count.members}/{world.maxMembers} players
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-black px-2.5 py-1">
              <Shield className="h-3.5 w-3.5" />
              {user.plan}
            </span>
          </div>
        </div>
      </section>

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

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <WorldRoomClient worldId={world.id} initialMessages={initialMessages} canPost={canPost} />

        <aside className="space-y-4">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="text-sm font-semibold text-white">Participants</h2>
            <div className="mt-3 space-y-2">
              {world.members.map((member) => {
                const name =
                  member.displayName ||
                  member.user.displayName ||
                  member.user.email?.split("@")[0] ||
                  "Player";
                const isOwnerMember = member.userId === world.ownerId;
                const canEditMemberRole =
                  canManageRoles && member.userId !== user.id && !isOwnerMember;
                return (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-black px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <span className="block truncate text-zinc-200">{name}</span>
                      {member.role === WorldRole.HOST ? (
                        <span className="inline-flex items-center gap-1 text-xs text-fuchsia-300">
                          <Crown className="h-3.5 w-3.5" />
                          {isOwnerMember ? "Host (Owner)" : "Co-host"}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500">Player</span>
                      )}
                    </div>
                    {canEditMemberRole ? (
                      <WorldMemberRoleControl
                        worldId={world.id}
                        memberUserId={member.userId}
                        role={member.role}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            Host: {world.owner.displayName || world.owner.email?.split("@")[0] || "Creator"}
            <div className="mt-2">Turns: {world._count.messages}</div>
            <div className="mt-1">Last activity: {new Date(world.lastActivityAt).toLocaleString()}</div>
          </div>

          <WorldFactionPanel
            worldId={world.id}
            canView={isMember}
            canManage={canManageRoles}
            canAdjust={canPost}
            meUserId={user.id}
            members={world.members.map((member) => ({
              userId: member.userId,
              name:
                member.displayName ||
                member.user.displayName ||
                member.user.email?.split("@")[0] ||
                "Player",
            }))}
          />

          {isHost ? <WorldInviteManager worldId={world.id} initialInvites={invites} /> : null}
        </aside>
      </section>
    </main>
  );
}
