"use client";

import React, { useState } from "react";
import { Search, X, Menu } from "lucide-react";
import UserBadge from "@/components/UserBadge";

interface NoemaTopNavProps {
  title?: string;
}

export function NoemaTopNav({ title }: NoemaTopNavProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="sticky top-0 z-30 flex h-[60px] min-w-0 items-center gap-2 px-3 sm:gap-3 sm:px-6"
      style={{
        background: "rgba(13,13,26,0.7)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Mobile logo */}
      <a href="/" className="flex sm:hidden items-center gap-2 shrink-0">
        <img src="/logo-icon.svg" alt="Noema" className="h-7 w-7" />
      </a>

      {title && !searchOpen && (
        <span className="hidden sm:block text-sm font-semibold text-white/80 truncate">{title}</span>
      )}

      <div className="flex-1" />

      {/* Search */}
      {searchOpen ? (
        <div className="flex flex-1 max-w-xs items-center gap-2 rounded-full bg-white/10 px-3 h-9 border border-white/10 focus-within:border-white/20 transition">
          <Search className="h-4 w-4 text-white/40 shrink-0" />
          <input
            autoFocus
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            placeholder="Search companions..."
            className="bg-transparent text-sm text-white placeholder-white/40 outline-none flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchVal.trim()) {
                window.location.href = `/companions?q=${encodeURIComponent(searchVal.trim())}`;
              }
              if (e.key === "Escape") {
                setSearchOpen(false);
                setSearchVal("");
              }
            }}
          />
          <button onClick={() => { setSearchOpen(false); setSearchVal(""); }}>
            <X className="h-4 w-4 text-white/40 hover:text-white/70 transition" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setSearchOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.07] text-white/50 hover:bg-white/10 hover:text-white/90 transition"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      )}

      {/* Create companion */}
      <a
        href="/companions/new"
        className="hidden sm:flex h-9 items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-4 text-xs font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
      >
        + Create
      </a>

      {/* User */}
      <div className="flex items-center">
        <UserBadge />
      </div>

      {/* Mobile menu hint */}
      <button
        onClick={() => setMenuOpen((open) => !open)}
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/50 transition hover:text-white sm:hidden"
        aria-label="Open navigation"
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {menuOpen ? (
        <div className="absolute inset-x-3 top-[68px] grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-[#151526]/98 p-3 shadow-2xl sm:hidden">
          {[
            ["/discover", "Discover"],
            ["/companions", "Companions"],
            ["/companions/new", "Create"],
            ["/chat", "Chat"],
            ["/roleplay", "Roleplay"],
            ["/worlds", "Worlds"],
            ["/marketplace", "Market"],
            ["/adult", "18+"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="flex min-h-11 items-center rounded-lg border border-white/[0.06] bg-white/[0.04] px-3 text-sm font-medium text-white/75"
            >
              {label}
            </a>
          ))}
        </div>
      ) : null}
    </header>
  );
}
