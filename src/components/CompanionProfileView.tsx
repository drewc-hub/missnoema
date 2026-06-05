"use client";

import { useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Compass,
  Images,
  MessageCircle,
  Shield,
  Sparkles,
  UserRound,
} from "lucide-react";

type ProfileStat = [string, number];

type ProfileAsset = {
  id: string;
  url: string;
};

type Props = {
  companion: {
    slug: string;
    name: string;
    description: string;
    tags: string[];
    contentRating: "SAFE" | "ADULT";
    primaryUrl: string | null;
    creatorName: string;
    isOwner: boolean;
    views: number;
    saves: number;
    chats: number;
    media: number;
  };
  profile: {
    scene?: string;
    personality?: string;
    background?: string;
    speakingStyle?: string;
    goals?: string;
  };
  stats: ProfileStat[];
  assets: ProfileAsset[];
};

const tabs = [
  { id: "overview", label: "Overview", icon: Sparkles },
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "gallery", label: "Gallery", icon: Images },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function CompanionProfileView({
  companion,
  profile,
  stats,
  assets,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const isAdult = companion.contentRating === "ADULT";

  return (
    <main className="mx-auto min-w-0 max-w-6xl text-zinc-100 lg:h-[calc(100dvh-7.5rem)] lg:min-h-[560px]">
      <section className="grid min-h-0 overflow-hidden rounded-lg border border-zinc-800 bg-black lg:h-full lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
        <div className="relative min-h-[340px] bg-zinc-950 lg:min-h-0">
          {companion.primaryUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={companion.primaryUrl}
              alt={`${companion.name} portrait`}
              className="absolute inset-0 h-full w-full object-cover object-top"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-7xl font-semibold text-zinc-800">
              {companion.name.slice(0, 1)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/5 to-black/20" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs ${
                isAdult
                  ? "border-rose-900/60 bg-rose-950/70 text-rose-200"
                  : "border-emerald-900/60 bg-emerald-950/70 text-emerald-200"
              }`}
            >
              {companion.contentRating}
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-xs text-zinc-300 backdrop-blur">
              <BadgeCheck className="h-3.5 w-3.5 text-fuchsia-300" />
              by {companion.creatorName}
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              {companion.name}
            </h1>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950/80">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex min-h-12 items-center justify-center gap-2 border-b-2 px-2 text-xs font-semibold transition sm:text-sm ${
                  activeTab === id
                    ? "border-fuchsia-400 bg-fuchsia-500/10 text-white"
                    : "border-transparent text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === "overview" ? (
              <div className="space-y-5">
                <p className="text-sm leading-7 text-zinc-300">
                  {companion.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {companion.tags.slice(0, 10).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Views", companion.views],
                    ["Saves", companion.saves],
                    ["Chats", companion.chats],
                    ["Media", companion.media],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-lg border border-zinc-800 bg-zinc-950 p-3"
                    >
                      <div className="text-[11px] uppercase text-zinc-600">
                        {label}
                      </div>
                      <div className="mt-1 text-lg font-bold text-white">
                        {Number(value).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-400">
                  <div
                    className={
                      isAdult
                        ? "flex items-center gap-2 text-rose-300"
                        : "flex items-center gap-2 text-emerald-300"
                    }
                  >
                    <Shield className="h-4 w-4" />
                    {isAdult ? "Adult companion" : "Safe companion"}
                  </div>
                  <p className="mt-2">
                    Available for companion chat and saved Story Mode campaigns.
                  </p>
                </div>
              </div>
            ) : null}

            {activeTab === "profile" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["Scene", profile.scene],
                  ["Personality", profile.personality],
                  ["Background", profile.background],
                  ["Speaking style", profile.speakingStyle],
                  ["Goals", profile.goals],
                ]
                  .filter((entry): entry is [string, string] =>
                    Boolean(entry[1]),
                  )
                  .map(([label, value]) => (
                    <section
                      key={label}
                      className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                    >
                      <h2 className="text-xs font-semibold uppercase text-fuchsia-300">
                        {label}
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {value}
                      </p>
                    </section>
                  ))}
                {stats.length ? (
                  <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 sm:col-span-2">
                    <h2 className="text-xs font-semibold uppercase text-fuchsia-300">
                      Stats
                    </h2>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {stats.map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-md border border-zinc-800 bg-black px-3 py-2 text-xs"
                        >
                          <div className="text-zinc-500">{label}</div>
                          <div className="font-semibold text-zinc-200">
                            {Math.round(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
            ) : null}

            {activeTab === "gallery" ? (
              assets.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {assets.map((asset) => (
                    <div
                      key={asset.id}
                      className="aspect-[3/4] overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={asset.url}
                        alt=""
                        className="h-full w-full object-cover object-top"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-zinc-800 p-5 text-sm text-zinc-500">
                  No additional gallery images yet.
                </div>
              )
            ) : null}
          </div>

          <div className="grid gap-2 border-t border-zinc-800 bg-zinc-950/80 p-3 sm:grid-cols-3">
            <a
              href="/companions"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 text-sm font-semibold text-zinc-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </a>
            <a
              href={`/companions/${encodeURIComponent(companion.slug)}/start`}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-fuchsia-500 text-sm font-semibold text-white hover:bg-fuchsia-400"
            >
              <MessageCircle className="h-4 w-4" />
              Chat or Story
            </a>
            <a
              href={
                companion.isOwner
                  ? `/companions/${companion.slug}/edit`
                  : "/marketplace"
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-800 text-sm font-semibold text-zinc-300 hover:border-fuchsia-500/70 hover:text-white"
            >
              <Compass className="h-4 w-4" />
              {companion.isOwner ? "Edit" : "Marketplace"}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
