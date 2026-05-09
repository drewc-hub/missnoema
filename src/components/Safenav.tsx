import UserBadge from "@/components/UserBadge";
import React from "react";

function NavLink({ href, label }: { href: string; label: string }) {
    return (
        <a
            href={href}
            className="inline-flex rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-blue-900/40 hover:text-white"
        >
            {label}
        </a>
    );
}


export function SafeTopNav() {
    return (
        <header className="sticky top-0 z-20 border-b border-blue-900/60 bg-gradient-to-r from-blue-950/95 to-blue-900/80 backdrop-blur-md">
            <div className="mx-auto flex w-full max-w-6xl items-center px-4 py-3">
                <a href="/" className="mr-4 flex items-center gap-2 shrink-0">
                    <img src="/logo-icon.svg" alt="" className="h-7 w-7" />
                    <img src="/logo-wordmark.svg" alt="Noema" className="h-5 hidden sm:block" />
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
                        <NavLink href="/(safe)/media" label="Media" />
                    </li>
                    <li>
                        <NavLink href="/chat" label="Chat" />
                    </li>
                    <li>
                        <NavLink href="account/billing" label="Subscriptions" />
                    </li>
                </ul>

                <div className="ml-auto flex items-center gap-2">
                    <UserBadge />
                </div>
            </div>
        </header>
    );
}
