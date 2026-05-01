import UserBadge from "@/components/UserBadge";
import React from "react";
import { TOP_NAV_LINKS } from "@/lib/nav-links";

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 hover:text-white"
    >
      {label}
    </a>
  );
}

function NavButtonLink({
  href,
  label,
  variant,
}: {
  href: string;
  label: string;
  variant: "ghost" | "primary";
}) {
  const base =
    "inline-flex items-center rounded-lg px-3 py-2 text-sm font-semibold transition-colors";
  const cls =
    variant === "primary"
      ? `${base} bg-white text-zinc-950 hover:bg-zinc-200`
      : `${base} border border-zinc-700 text-zinc-200 hover:bg-zinc-900 hover:text-white`;

  return (
    <a href={href} className={cls}>
      {label}
    </a>
  );
}

export function TopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-slate-800/50 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3">
        <a
          href="/"
          className="mr-3 text-sm font-semibold tracking-wide text-white"
        >
          NOMEA
        </a>

        <ul className="flex items-center space-x-1">
          {TOP_NAV_LINKS.map((l) => (
            <li key={l.href}>
              <NavLink href={l.href} label={l.label} />
            </li>
          ))}
        </ul>

        {/* Right side (single ml-auto group) */}
        <div className="ml-auto flex items-center gap-3">
          <UserBadge />
          <NavButtonLink href="/login" label="Log in" variant="ghost" />
          <NavButtonLink href="/register" label="Sign up" variant="primary" />
        </div>
      </div>
    </header>
  );
}
