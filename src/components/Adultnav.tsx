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


export function AdultTopNav() {
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
                        <NavLink href="/adult/companions" label="Companions" />
                    </li>
                    <li>
                        <NavLink href="/adult/companions/new" label="Create" />
                    </li>
                    <li>
                        <NavLink href="/adult" label="Adult" />
                    </li>
                    <li>
                        <NavLink href="/admin" label="Admin" />
                    </li>
                    <li>
                        <NavLink href="/generate" label="Generate" />
                    </li>
                    <li>
                        <NavLink href="/media" label="Media" />
                    </li>
                    <li>
                        <NavLink href="/adult/chat" label="Chat" />
                    </li>
                    <li>
                        <NavLink href="/account/billing" label="Subscriptions" />
                    </li>
                </ul>

                <div className="ml-auto flex items-center gap-2">
                    <UserBadge />
                </div>
            </div>
        </header>
    );
}
