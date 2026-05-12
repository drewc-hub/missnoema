import { Globe2, Lock, PlusCircle, Sparkles, Users } from "lucide-react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRpWorldEligible } from "@/lib/rp-world";
import { WorldCreateForm } from "@/components/WorldCreateForm";
import { WorldJoinByCodeForm } from "@/components/WorldJoinByCodeForm";

export default async function WorldsLobbyPage() {
  const user = await getAuthedUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/worlds")}`);
  }

  const [myWorlds, publicWorlds] = await Promise.all([
    prisma.world.findMany({
      where: {
        members: {
          some: { userId: user.id },
        },
      },
      orderBy: [{ lastActivityAt: "desc" }],
      take: 20,
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        isPublic: true,
        maxMembers: true,
        lastActivityAt: true,
        _count: { select: { members: true, messages: true } },
      },
    }),
    prisma.world.findMany({
      where: {
        isPublic: true,
        members: {
          none: { userId: user.id },
        },
      },
      orderBy: [{ lastActivityAt: "desc" }],
      take: 20,
      select: {
        id: true,
        slug: true,
        name: true,
        summary: true,
        maxMembers: true,
        lastActivityAt: true,
        owner: {
          select: {
            displayName: true,
            email: true,
          },
        },
        _count: { select: { members: true, messages: true } },
      },
    }),
  ]);

  const eligible = isRpWorldEligible(user.plan);

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
          <Sparkles className="h-3.5 w-3.5" />
          Multiplayer RP
        </div>
        <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
          RP world lobby
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
          Create shared fantasy worlds, invite players, and run persistent scene threads with
          turn-based posting.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <PlusCircle className="h-4 w-4 text-fuchsia-300" />
            Create world
          </div>
          {eligible ? (
            <WorldCreateForm />
          ) : (
            <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-4 text-sm text-amber-100">
              Multiplayer worlds are unlocked for PRO and UNLIMITED plans.
              <a className="ml-2 font-semibold text-white underline" href="/account/billing">
                Upgrade plan
              </a>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
              <Globe2 className="h-4 w-4 text-fuchsia-300" />
              Joined worlds
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{myWorlds.length}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
              <Users className="h-4 w-4 text-fuchsia-300" />
              Public worlds
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{publicWorlds.length}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center gap-2 text-xs uppercase text-zinc-500">
              <Lock className="h-4 w-4 text-fuchsia-300" />
              Plan
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">{user.plan}</div>
          </div>
        </div>
      </section>

      <section>
        <WorldJoinByCodeForm />
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Your active worlds</h2>
          {myWorlds.length > 0 ? (
            myWorlds.map((world) => (
              <article
                key={world.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
              >
                <a href={`/worlds/${world.slug}`} className="text-lg font-semibold text-white hover:text-fuchsia-200">
                  {world.name}
                </a>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{world.summary}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>{world._count.members}/{world.maxMembers} players</span>
                  <span>{world._count.messages} turns</span>
                  <span>{world.isPublic ? "Public" : "Private"}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
              You have not joined any worlds yet.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-white">Public worlds</h2>
          {publicWorlds.length > 0 ? (
            publicWorlds.map((world) => (
              <article
                key={world.id}
                className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
              >
                <a href={`/worlds/${world.slug}`} className="text-lg font-semibold text-white hover:text-fuchsia-200">
                  {world.name}
                </a>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{world.summary}</p>
                <div className="mt-2 text-xs text-zinc-500">
                  Host: {world.owner.displayName || world.owner.email?.split("@")[0] || "Creator"}
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
                  <span>{world._count.members}/{world.maxMembers} players</span>
                  <span>{world._count.messages} turns</span>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-lg border border-dashed border-zinc-800 bg-zinc-950 p-5 text-sm text-zinc-500">
              No open worlds yet. Create the first one.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
