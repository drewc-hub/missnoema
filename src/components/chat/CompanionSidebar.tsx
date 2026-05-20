"use client";

import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Badge,
  SidebarCompanionSkeleton,
} from "@/components/ui";
import type { Companion, MediaHistoryItem } from "@/components/chat/types";

type Props = {
  companions: Companion[];
  filteredCompanions: Companion[];
  companionSearch: string;
  setCompanionSearch: (value: string) => void;
  loadingList: boolean;
  activeId: string;
  setActiveId: (id: string) => void;
  setSidebarOpen: (value: boolean | ((prev: boolean) => boolean)) => void;
  setDeleteConfirmId: (id: string) => void;
  activeCompanion: Companion | null;
  mediaHistory: MediaHistoryItem[];
  loadingHistory: boolean;
  setLightboxItem: (item: MediaHistoryItem) => void;
};

export function CompanionSidebar({
  filteredCompanions,
  companionSearch,
  setCompanionSearch,
  loadingList,
  activeId,
  setActiveId,
  setSidebarOpen,
  setDeleteConfirmId,
  activeCompanion,
  mediaHistory,
  loadingHistory,
  setLightboxItem,
}: Props) {
  return (
    <aside className="space-y-4 lg:col-span-3">
      <Card>
        <CardHeader
          title="Companions"
          subtitle={loadingList ? "Loading…" : `${filteredCompanions.length} shown`}
        />
        <CardBody>
          <div className="space-y-2">
            <Input
              placeholder="Search companions…"
              value={companionSearch}
              onChange={(e) => setCompanionSearch(e.target.value)}
            />

            {loadingList ? (
              <div className="space-y-2">
                <SidebarCompanionSkeleton />
                <SidebarCompanionSkeleton />
                <SidebarCompanionSkeleton />
              </div>
            ) : null}

            {!loadingList && filteredCompanions.length === 0 ? (
              <div className="text-sm text-zinc-400">
                {companionSearch
                  ? "No matches."
                  : "Browse the library and click a companion to start chatting."}
              </div>
            ) : null}

            {filteredCompanions.map((c) => (
              <div key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(c.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full rounded-xl border p-3 pr-8 text-left transition-all duration-200 ${
                    c.id === activeId
                      ? "border-zinc-300 bg-zinc-800"
                      : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900/70"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
                      {c.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.thumbnailUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm text-zinc-600">
                          {c.name[0]}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate font-medium text-zinc-100">{c.name}</div>
                        <Badge tone={c.contentRating === "ADULT" ? "adult" : "safe"}>
                          {c.contentRating}
                        </Badge>
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                        {c.description}
                      </div>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(c.id);
                  }}
                  className="absolute right-2 top-2 rounded p-1 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-900/20 hover:text-red-400"
                  title="Remove companion"
                >
                  🗑
                </button>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {activeCompanion ? (
        <Card>
          <CardHeader
            title="Media history"
            subtitle={
              loadingHistory
                ? "Loading…"
                : `${mediaHistory.length} item${mediaHistory.length === 1 ? "" : "s"}`
            }
          />
          <CardBody>
            {loadingHistory ? (
              <div className="text-sm text-zinc-400">Loading history...</div>
            ) : mediaHistory.length === 0 ? (
              <div className="text-sm text-zinc-500">No generated media yet.</div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {mediaHistory.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLightboxItem(item)}
                    className="group relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 transition-all duration-200 hover:border-zinc-600 hover:shadow-md"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-zinc-900">
                      {item.type === "VIDEO" ? (
                        <video className="h-full w-full object-cover" muted preload="metadata">
                          <source src={item.url} />
                        </video>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.url}
                          alt="Media history item"
                          className="h-full w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                    <div className="p-1.5 text-center text-[10px] text-zinc-500">
                      {item.type} {item.isCover ? "🖼" : item.isFavorite ? "★" : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      ) : null}
    </aside>
  );
}
