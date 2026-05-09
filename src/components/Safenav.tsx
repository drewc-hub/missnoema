import UserBadge from "@/components/UserBadge";
import React from "react";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex rounded-xl px-3 py-2 text-sm font-medium text-zinc-300 transition hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
    >
      {label}
    </a>
  );
}

export function SafeTopNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center px-6 py-4">
        <a href="/" className="mr-6 flex shrink-0 items-center gap-3">
          <img src="/logo-icon.svg" alt="" className="h-8 w-8" />
          <img
            src="/logo-wordmark.svg"
            alt="Noema"
            className="hidden h-5 sm:block"
          />
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          <li>
            <NavLink href="/companions" label="Companions" />
          </li>
          <li>
            <NavLink href="/companions/new" label="Create" />
          </li>
          <li>
            <NavLink href="/adult" label="Adult" />
          </li>
          <li>
            <NavLink href="/media" label="Media" />
          </li>
          <li>
            <NavLink href="/chat" label="Chat" />
          </li>
          <li>
            <NavLink href="/account/billing" label="Subscriptions" />
          </li>
          <li>
            <NavLink href="/about" label="About Us" />
          </li>
          <li>
            <NavLink href="/admin" label="Admin" />
          </li>
        </ul>

        <div className="ml-auto flex items-center gap-3">
          <UserBadge />
        </div>
      </div>
    </header>
  );
}
