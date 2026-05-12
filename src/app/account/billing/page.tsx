"use client";
import './globals.css';
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type PlanKey = "premium" | "premium_plus";
type CoinPackKey = "coins_500" | "coins_1200" | "coins_2500";
type PremiumItem = {
  sku: string;
  featureKey: string;
  title: string;
  description: string;
  coinsCost: number;
  grantQuantity: number;
  kind: "unlock" | "consumable";
  unlocked?: boolean;
  quantity?: number;
  purchasable?: boolean;
};

const PLANS = [
  {
    key: "premium" as PlanKey,
    name: "Noema Premium",
    priceLabel: "$14.99/month",
    description: "A strong monthly plan for consistent companion use.",
    features: [
      "Up to 10 active companions",
      "5,000 chat messages per month",
      "50 image generations per month",
      "5 video generations per month",
    ],
  },
  {
    key: "premium_plus" as PlanKey,
    name: "Noema Premium Plus",
    priceLabel: "$29.99/month",
    description: "Higher limits for users who want more freedom and creation.",
    features: [
      "Up to 25 active companions",
      "Unlimited chat",
      "200 image generations per month",
      "25 video generations per month",
    ],
  },
];

const COIN_PACKS = [
  {
    key: "coins_500" as CoinPackKey,
    name: "500 Coins",
    priceLabel: "$4.99",
    description: "Good for a small top-up.",
  },
  {
    key: "coins_1200" as CoinPackKey,
    name: "1200 Coins",
    priceLabel: "$9.99",
    description: "Best starter pack.",
  },
  {
    key: "coins_2500" as CoinPackKey,
    name: "2500 Coins",
    priceLabel: "$19.99",
    description: "Heavy-use top-up.",
  },
];

function BillingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);
  const [loadingCoinPack, setLoadingCoinPack] =
    useState<CoinPackKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [coinBalance, setCoinBalance] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [isPollingBalance, setIsPollingBalance] = useState(false);
  const [premiumItems, setPremiumItems] = useState<PremiumItem[]>([]);
  const [loadingPremiumSku, setLoadingPremiumSku] = useState<string | null>(null);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the balance we knew about before the latest coin purchase, so we
  // can detect when the webhook has actually credited the new coins.
  const baselineBalanceRef = useRef<number | null>(null);

  const checkoutState = useMemo(() => searchParams.get("checkout"), [searchParams]);
  const coinState = useMemo(() => searchParams.get("coins"), [searchParams]);

  // Initial balance fetch on mount. We capture this value as the "baseline"
  // so the post-purchase poller can detect a real increase.
  useEffect(() => {
    let cancelled = false;
    async function fetchBalance() {
      try {
        const res = await fetch("/api/me/balance", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data?.ok) {
          setCoinBalance(data.coinBalance);
          setPlan(data.plan);
          if (baselineBalanceRef.current === null) {
            baselineBalanceRef.current = data.coinBalance;
          }
        }
      } catch {
        // non-fatal — balance just won't show
      }
    }
    fetchBalance();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function fetchPremium() {
      try {
        const res = await fetch("/api/premium/catalog", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && Array.isArray(data?.items)) {
          setPremiumItems(data.items as PremiumItem[]);
        }
      } catch {
        // non-fatal
      }
    }
    fetchPremium();
    return () => {
      cancelled = true;
    };
  }, []);

  // After a successful coin purchase, poll /api/me/balance until the balance
  // actually increases (the Stripe webhook is asynchronous and may arrive
  // after the success redirect). Only redirect once we've observed the
  // update, or after we've exhausted the polling window.
  useEffect(() => {
    if (coinState !== "success") return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const POLL_INTERVAL_MS = 1500;
    const MAX_POLL_ATTEMPTS = 14; // ~21 seconds total
    const REDIRECT_DELAY_MS = 4000;

    async function fetchBalanceOnce() {
      try {
        const res = await fetch("/api/me/balance", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.ok) {
          return {
            coinBalance: data.coinBalance as number,
            plan: data.plan as string,
          };
        }
      } catch {
        // ignore — the next poll will retry
      }
      return null;
    }

    async function pollForBalanceUpdate() {
      setIsPollingBalance(true);
      let baseline = baselineBalanceRef.current;
      let updated = false;

      for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS && !cancelled; attempt++) {
        const result = await fetchBalanceOnce();
        if (cancelled) return;

        if (result) {
          setCoinBalance(result.coinBalance);
          setPlan(result.plan);

          if (baseline === null) {
            // First successful read becomes the baseline so a later poll
            // can detect a real increase.
            baseline = result.coinBalance;
          } else if (result.coinBalance > baseline) {
            baselineBalanceRef.current = result.coinBalance;
            updated = true;
            break;
          }
        }

        await new Promise<void>((resolve) => {
          pollTimer = setTimeout(resolve, POLL_INTERVAL_MS);
        });
      }

      if (cancelled) return;

      setIsPollingBalance(false);
      if (!updated) {
        console.warn(
          "Coin balance did not update within the expected window after purchase.",
        );
      }

      redirectTimerRef.current = setTimeout(() => {
        router.push("/companions");
      }, REDIRECT_DELAY_MS);
    }

    pollForBalanceUpdate();

    return () => {
      cancelled = true;
      setIsPollingBalance(false);
      if (pollTimer) clearTimeout(pollTimer);
      if (redirectTimerRef.current) clearTimeout(redirectTimerRef.current);
    };
  }, [coinState, router]);

  async function handleSubscribe(plan: PlanKey) {
    try {
      setLoadingPlan(plan);
      setError(null);

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const raw = await res.text();
      const data = JSON.parse(raw);

      if (!res.ok) throw new Error(data.error || "Failed to start checkout");
      if (!data.url) throw new Error("Missing checkout URL");

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingPlan(null);
    }
  }

  async function handleBuyCoins(pack: CoinPackKey) {
    try {
      setLoadingCoinPack(pack);
      setError(null);

      const res = await fetch("/api/coins/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack }),
      });

      const raw = await res.text();
      const data = JSON.parse(raw);

      if (!res.ok) throw new Error(data.error || "Failed to start coin checkout");
      if (!data.url) throw new Error("Missing checkout URL");

      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoadingCoinPack(null);
    }
  }

  async function handleBuyPremium(sku: string) {
    try {
      setLoadingPremiumSku(sku);
      setError(null);

      const res = await fetch("/api/premium/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sku }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Purchase failed.");
      }

      if (typeof data?.newCoinBalance === "number") {
        setCoinBalance(data.newCoinBalance);
      }

      const premiumRes = await fetch("/api/premium/catalog", { cache: "no-store" });
      const premiumData = await premiumRes.json().catch(() => null);
      if (premiumRes.ok && Array.isArray(premiumData?.items)) {
        setPremiumItems(premiumData.items as PremiumItem[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoadingPremiumSku(null);
    }
  }

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
          })}
        </div>
      </section>

      <section className="mt-12">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">Premium Unlocks</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Spend coins to unlock monetized companion features.
          </p>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {premiumItems.map((item) => {
            const isLoading = loadingPremiumSku === item.sku;
            const isUnlock = item.kind === "unlock";
            const isOwned = !!item.unlocked;
            const quantity = item.quantity ?? 0;
            const lockedByAge = item.purchasable === false;
            return (
              <div
                key={item.sku}
                className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-xl"
              >
                <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
                <div className="mt-4 text-xl font-bold text-fuchsia-300">
                  {item.coinsCost.toLocaleString()} coins
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  {isUnlock
                    ? isOwned
                      ? "Unlocked"
                      : "Permanent unlock"
                    : `Balance: ${quantity}`}
                </div>

                <button
                  type="button"
                  onClick={() => handleBuyPremium(item.sku)}
                  disabled={
                    loadingPlan !== null ||
                    loadingCoinPack !== null ||
                    loadingPremiumSku !== null ||
                    lockedByAge ||
                    (isUnlock && isOwned)
                  }
                  className="mt-5 w-full rounded-xl bg-fuchsia-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {lockedByAge
                    ? "Age verification required"
                    : isUnlock && isOwned
                    ? "Owned"
                    : isLoading
                    ? "Processing..."
                    : "Unlock"}
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400">Loading billing…</div>}>
      <BillingContent />
    </Suspense>
  );
}
