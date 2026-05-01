"use client";

import { useSearchParams } from "next/navigation";

export default function BillingContent() {
  const searchParams = useSearchParams();
  // ... move your existing page logic here
  
  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-white">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Choose the plan that fits how you want to use Noema.
        </p>
      </div>

      {/* Coin balance widget */}
      {coinBalance !== null && (
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/70 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-zinc-500">Coin Balance</div>
            <div className="mt-1 text-3xl font-bold">
              {coinBalance.toLocaleString()}
              <span className="ml-2 text-base font-normal text-zinc-400">coins</span>
            </div>
          </div>
          {plan && (
            <div className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-1.5 text-sm text-zinc-300">
              {plan === "BASIC" ? "Free" : plan === "PRO" ? "Premium" : plan}
            </div>
          )}
        </div>
      )}

      {checkoutState === "success" && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          Checkout completed. Your subscription should activate shortly.
        </div>
      )}

      {checkoutState === "cancelled" && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
          Checkout was cancelled. No charge was made.
        </div>
      )}

      {coinState === "success" && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
          <div className="flex items-center justify-between gap-4">
            <span>
              {isPollingBalance
                ? "Coin purchase received — updating your balance…"
                : "Coin purchase completed — your balance has been updated."}
            </span>
            <button
              type="button"
              onClick={() => router.push("/companions")}
              className="shrink-0 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
            >
              Back to chat →
            </button>
          </div>
          <div className="mt-2 text-xs text-emerald-400/70">
            {isPollingBalance
              ? "This usually takes just a few seconds."
              : "Redirecting to chat in a few seconds…"}
          </div>
        </div>
      )}

      {coinState === "cancelled" && (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-300">
          Coin purchase was cancelled. No charge was made.
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isLoading = loadingPlan === plan.key;
          const isPlus = plan.key === "premium_plus";

          return (
            <section
              key={plan.key}
              className={`rounded-3xl border p-8 shadow-xl ${
                isPlus
                  ? "border-fuchsia-500/30 bg-fuchsia-500/5"
                  : "border-zinc-800 bg-zinc-950/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.18em] text-zinc-500">
                    {isPlus ? "Most Popular" : "Base Tier"}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">{plan.name}</h2>
                </div>

                {isPlus && (
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 text-xs font-medium text-fuchsia-300">
                    Best Value
                  </span>
                )}
              </div>

              <div className="mt-5 text-3xl font-bold">{plan.priceLabel}</div>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3 text-sm text-zinc-200">
                {plan.features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSubscribe(plan.key)}
                disabled={loadingPlan !== null || loadingCoinPack !== null}
                className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isPlus
                    ? "bg-fuchsia-500 text-white hover:opacity-90"
                    : "bg-white text-black hover:opacity-90"
                }`}
              >
                {isLoading ? "Redirecting..." : `Choose ${plan.name}`}
              </button>
            </section>
          );
        })}
      </div>

      <section className="mt-12">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Coin Packs</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Buy extra coins when you hit your monthly limits.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {COIN_PACKS.map((pack) => {
            const isLoading = loadingCoinPack === pack.key;

            return (
              <div
                key={pack.key}
                className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-xl"
              >
                <h3 className="text-xl font-semibold">{pack.name}</h3>
                <div className="mt-3 text-3xl font-bold">{pack.priceLabel}</div>
                <p className="mt-3 text-sm text-zinc-400">{pack.description}</p>

                <button
                  type="button"
                  onClick={() => handleBuyCoins(pack.key)}
                  disabled={loadingPlan !== null || loadingCoinPack !== null}
                  className="mt-6 w-full rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Redirecting..." : `Buy ${pack.name}`}
                </button>
              </div>
            );
             <Suspense fallback={<div>Loading...</div>}>
      <BillingContent />
    </Suspense>
          })}
        </div>
      </section>
    </main>
  );
}

