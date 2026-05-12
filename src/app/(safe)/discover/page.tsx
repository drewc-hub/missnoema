import { Compass, Sparkles } from "lucide-react";
import { getAuthedUser } from "@/lib/auth";
import { getMatchmakingDeck } from "@/lib/matchmaking";
import { DiscoveryDeck } from "@/components/DiscoveryDeck";
import { isAdultAllowed } from "@/lib/ratings";

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ includeAdult?: string }>;
}) {
  const user = await getAuthedUser();
  const params = await searchParams;
  const adultAllowed = isAdultAllowed(user);
  const includeAdult = adultAllowed && params.includeAdult === "1";

  const deck = await getMatchmakingDeck({
    user,
    limit: 20,
    includeAdult,
  });

  return (
    <main className="space-y-6 text-zinc-100">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-1 text-xs text-fuchsia-200">
              <Compass className="h-3.5 w-3.5" />
              Fantasy Tinder
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Discover companions one at a time
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Pass, save, or jump straight into chat. The deck now uses your
              discovery history to avoid recently skipped companions.
            </p>
          </div>
          <a
            href="/tavern"
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-black px-4 text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
          >
            <Sparkles className="h-4 w-4" />
            Tavern
          </a>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href="/discover"
            className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition ${
              !includeAdult
                ? "border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-100"
                : "border-zinc-800 bg-black text-zinc-300 hover:border-fuchsia-500/50 hover:text-white"
            }`}
          >
            Safe Matches
          </a>
          {adultAllowed ? (
            <a
              href="/discover?includeAdult=1"
              className={`inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold transition ${
                includeAdult
                  ? "border-fuchsia-500/60 bg-fuchsia-500/20 text-fuchsia-100"
                  : "border-zinc-800 bg-black text-zinc-300 hover:border-fuchsia-500/50 hover:text-white"
              }`}
            >
              Safe + Adult Matches
            </a>
          ) : (
            <a
              href="/adult/verify?next=%2Fdiscover%3FincludeAdult%3D1"
              className="inline-flex h-9 items-center rounded-lg border border-zinc-800 bg-black px-3 text-xs font-semibold text-zinc-300 transition hover:border-fuchsia-500/50 hover:text-white"
            >
              Unlock Adult Matches
            </a>
          )}
        </div>
      </section>

      <DiscoveryDeck
        initialCompanions={deck.items}
        signedIn={Boolean(user)}
        mode="matchmaking"
        includeAdult={includeAdult}
      />
    </main>
  );
}
