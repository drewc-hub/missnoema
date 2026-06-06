"use client";

import React, { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Compass,
  Wand2,
  MessageSquare,
  Flame,
  Globe,
  ShoppingBag,
  BookOpen,
  CastleIcon,
  ChevronRight,
  MessageSquarePlusIcon,
} from "lucide-react";

interface NavItem {
  href: string;
  icon: React.ReactNode;
  label: string;
  accent?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/discover",
    icon: <Compass className="h-5 w-5" />,
    label: "Discover",
  },
  {
    href: "/companions",
    icon: <BookOpen className="h-5 w-5" />,
    label: "Companions",
  },
  {
    href: "/companions/new",
    icon: <Wand2 className="h-5 w-5" />,
    label: "Create",
  },
  {
    href: "/roleplay",
    icon: <MessageSquarePlusIcon className="h-5 w-5" />,
    label: "Roleplay",
  },
  { href: "/chat", icon: <MessageSquare className="h-5 w-5" />, label: "Chat" },
  { href: "/worlds", icon: <Globe className="h-5 w-5" />, label: "Worlds" },
  {
    href: "/marketplace",
    icon: <ShoppingBag className="h-5 w-5" />,
    label: "Market",
  },
  {
    href: "/tavern",
    icon: <CastleIcon className="h-5 w-5" />,
    label: "Tavern",
  },
  {
    href: "/adult",
    icon: <Flame className="h-5 w-5" />,
    label: "18+",
    accent: "text-rose-400",
  },
];

function SidebarItem({
  item,
  expanded,
  active,
}: {
  item: NavItem;
  expanded: boolean;
  active?: boolean;
}) {
  return (
    <a
      href={item.href}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150
        ${
          active
            ? "bg-white/10 text-white"
            : "text-white/50 hover:bg-white/[0.06] hover:text-white/90"
        }
        ${item.accent && !active ? item.accent : ""}
      `}
    >
      <span className="shrink-0">{item.icon}</span>
      <span
        className={`whitespace-nowrap text-sm font-medium transition-all duration-200 overflow-hidden
          ${expanded ? "w-auto opacity-100" : "w-0 opacity-0"}
        `}
      >
        {item.label}
      </span>
      {!expanded && (
        <div className="pointer-events-none absolute left-full ml-2 hidden rounded-md bg-[#1a1a2e] px-2 py-1 text-xs font-medium text-white shadow-xl group-hover:block z-50 border border-white/10">
          {item.label}
        </div>
      )}
    </a>
  );
}

export function NoemaAppShell({ children }: { children: React.ReactNode }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className="flex min-h-screen min-w-0 max-w-full overflow-x-clip"
      style={{
        background:
          "#0D0D1A radial-gradient(ellipse 80% 50% at 20% 0%, rgba(160,120,255,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 100%, rgba(60,100,255,0.10) 0%, transparent 60%)",
      }}
    >
      {/* Sidebar */}
      <aside
        className={`fixed left-4 top-1/2 z-40 hidden max-h-[calc(100dvh-2rem)] -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-black/35 transition-all duration-300 sm:flex
          ${sidebarExpanded ? "w-48" : "w-[72px]"}
        `}
        style={{
          background: "rgba(14, 14, 28, 0.78)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-3 py-4">
          <a
            href="/"
            className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-white/5 ring-1 ring-white/10"
          >
            <img src="/logo-icon.svg" alt="Noema" className="h-7 w-7" />
          </a>
          <span
            className={`text-white font-bold text-base tracking-tight transition-all duration-200 overflow-hidden whitespace-nowrap
              ${sidebarExpanded ? "w-auto opacity-100" : "w-0 opacity-0"}
            `}
          >
            Noema
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {NAV_ITEMS.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              expanded={sidebarExpanded}
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
        </nav>

        {/* Expand toggle */}
        <button
          onClick={() => setSidebarExpanded((v) => !v)}
          className="flex items-center justify-center m-2 h-9 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-all duration-150"
          aria-label="Toggle sidebar"
        >
          <ChevronRight
            className={`h-4 w-4 transition-transform duration-300 ${sidebarExpanded ? "rotate-180" : ""}`}
          />
        </button>
      </aside>

      {/* Main */}
      <div
        className={`flex min-w-0 max-w-full flex-1 flex-col pb-20 transition-[padding] duration-300 sm:pb-0 ${
          sidebarExpanded ? "sm:pl-56" : "sm:pl-24"
        }`}
      >
        {children}
      </div>

      <nav
        className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-5 rounded-2xl border border-white/10 bg-[#111120]/88 px-1 pb-[calc(env(safe-area-inset-bottom)+0.25rem)] pt-1 shadow-2xl shadow-black/40 backdrop-blur-xl sm:hidden"
        aria-label="Primary navigation"
      >
        {NAV_ITEMS.slice(0, 5).map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition ${
              pathname === item.href || pathname.startsWith(`${item.href}/`)
                ? "bg-white/10 text-white"
                : item.accent ?? "text-white/60"
            }`}
          >
            {item.icon}
            <span className="max-w-full truncate">{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
