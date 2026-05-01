import UserBadge from "@/components/UserBadge";
import React from "react";

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

export function SafeTopNav() {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-800 bg-slate-800 bg-opacity-50">
      <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3">
        <a
          href="/"
          className="mr-3 text-sm font-semibold tracking-wide text-white"
        >
          NOMEA
        </a>

        <ul className="flex items-center space-x-1">
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
            <NavLink href="/admin" label="Admin" />
          </li>
          <li>
            <NavLink href="/(safe)/generate" label="Generate" />
          </li>
          <li>
            <NavLink href="/(safe)/media" label="Media" />
          </li>
          <li>
            <NavLink href="/chat" label="Chat" />
          </li>
        </ul>

        {/* ✅ right side, after menu items */}
        <div className="ml-auto">
          {/* async server component */}
          {/* @ts-expect-error Server Component */}
          <UserBadge />
        </div>

        {/* Push auth buttons to the right */}
        <div className="ml-auto flex items-center gap-2">
          <NavButtonLink href="/(safe)/login" label="Log in" variant="ghost" />
          <NavButtonLink href="/register" label="Sign up" variant="primary" />
        </div>
      </div>
    </header>
  );
}
