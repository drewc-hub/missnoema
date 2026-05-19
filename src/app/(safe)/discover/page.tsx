import { getAuthedUser } from "@/lib/auth";
import { getMatchmakingDeck } from "@/lib/matchmaking";
import { DiscoveryDeck } from "@/components/DiscoveryDeck";
import { isAdultAllowed } from "@/lib/ratings";
import { Compass, Sparkles } from "lucide-react";

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
    <div className="space-y-6">
      {/* Hero header */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(ellipse 80% 120% at 50% -20%, rgba(160,100,255,0.22) 0%, transparent 70%), rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/[0.12] px-3 py-1 text-xs text-fuchsia-300 mb-3">
              <Compass className="h-3.5 w-3.5" />
              Discover
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Find your companion
            </h1>
            <p className="mt-1.5 max-w-lg text-sm text-white/50 leading-relaxed">
              Swipe through companions one at a time — pass, save, or jump straight into chat.
            </p>
          </div>
          <a
            href="/tavern"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 text-xs font-semibold text-white/70 hover:bg-white/10 hover:text-white transition"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Tavern
          </a>
        </div>

        {/* Filter pills */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <a
            href="/discover"
            className={`inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold transition ${
              !includeAdult
                ? "bg-white/[0.15] text-white border border-white/15"
                : "text-white/40 hover:bg-white/[0.07] hover:text-white/70"
            }`}
          >
            Safe
          </a>
          {adultAllowed ? (
            <a
              href="/discover?includeAdult=1"
              className={`inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold transition ${
                includeAdult
                  ? "bg-white/[0.15] text-white border border-white/15"
                  : "text-white/40 hover:bg-white/[0.07] hover:text-white/70"
              }`}
            >
              Safe + Adult
            </a>
          ) : (
            <a
              href="/adult/verify?next=%2Fdiscover%3FincludeAdult%3D1"
              className="inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold text-white/30 hover:bg-white/[0.07] hover:text-white/60 transition"
            >
              Unlock 18+ →
            </a>
          )}
          <a
            href="/companions"
            className="inline-flex h-8 items-center rounded-full px-4 text-xs font-semibold text-white/30 hover:bg-white/[0.07] hover:text-white/60 transition"
          >
            Browse all →
          </a>
        </div>
      </div>

      {/* Discovery deck */}
      <DiscoveryDeck
        initialCompanions={deck.items}
        signedIn={Boolean(user)}
        mode="matchmaking"
        includeAdult={includeAdult}
      />
    </div>
  );
}
