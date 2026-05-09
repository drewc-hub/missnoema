"use client";
import { useEffect, useState } from "react";

type RewardResult = {
  alreadyClaimed: boolean;
  streak: number;
  coins: number;
  coinBalance: number;
  streakBroken?: boolean;
};

export function DailyRewardClaim() {
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only claim once per page-load session
    const key = "daily_reward_claimed_" + new Date().toDateString();
    if (sessionStorage.getItem(key)) return;

    fetch("/api/me/daily-login", { method: "POST" })
      .then((r) => r.json())
      .then((data: RewardResult) => {
        sessionStorage.setItem(key, "1");
        if (!data.alreadyClaimed && data.coins > 0) {
          setReward(data);
          setVisible(true);
          setTimeout(() => setVisible(false), 5000);
        }
      })
      .catch(() => {});
  }, []);

  if (!reward || !visible) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-2xl border border-yellow-500/40 bg-zinc-900/95 px-5 py-4 shadow-xl backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in duration-300"
      style={{ maxWidth: 280 }}
    >
      <div className="text-2xl leading-none select-none">🪙</div>
      <div>
        <div className="text-sm font-semibold text-yellow-400">
          +{reward.coins} coins earned!
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">
          {reward.streakBroken
            ? "Welcome back! Streak reset — Day 1."
            : `Day ${reward.streak} streak${reward.streak >= 7 ? " 🔥" : reward.streak >= 3 ? " ✨" : ""}`}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          Balance: {reward.coinBalance} coins
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="ml-auto text-zinc-600 hover:text-zinc-400 text-lg leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
