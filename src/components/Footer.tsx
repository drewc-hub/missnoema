import React from "react";
import { Badge } from "@/components/ui";

function cx(...parts: Array<string | undefined | false>) {
    return parts.filter(Boolean).join(" ");
}

export function Footer({
    brand = "NOEMA",
    year = new Date().getFullYear(),
    className,
}: {
    brand?: string;
    year?: number;
    className?: string;
}) {
    return (
        <footer
            className={cx(
                "mt-14 border-t border-zinc-800 bg-zinc-950 py-10 text-sm",
                className,
            )}
        >
            <div className="mx-auto grid rounded-lg max-w-6xl gap-8 px-4 md:grid-cols-12 border-zinc-950">
                <div className="md:col-span-5">
                    <div className="flex items-center gap-2 rounded-3x1">
                        <div className="text-base font-semibold text-zinc-100">{brand}</div>
                        <Badge tone="safe">SAFE by default</Badge>
                        <Badge>18+ gated (web-only)</Badge>
                    </div>

                    <p className="mt-3 max-w-md text-zinc-400">
                        A companion universe you can actually use for free. Paid tiers and
                        coin packs unlock higher limits and power features, but the core
                        experience stays accessible.
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                        <a
                            href="/adult/companions"
                            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200"
                        >
                            Browse companions
                        </a>
                        <a
                            href="/companions/new"
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900"
                        >
                            Create one
                        </a>
                        <a
                            href="/adult"
                            className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-zinc-900"
                        >
                            18+ info
                        </a>
                    </div>

                    <div className="mt-4 text-xs text-zinc-500">
                        © {year} {brand}. Web-only 18+ content is age-gated and never shown
                        by default.
                    </div>
                </div>

                <div className="grid gap-8 md:col-span-7 md:grid-cols-3">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                            Product
                        </div>
                        <ul className="mt-3 space-y-2 text-zinc-400">
                            <li>
                                <a className="hover:text-white" href="/adult/companions">
                                    Library
                                </a>
                            </li>
                            <li>
                                <a className="hover:text-white" href="/companions/new">
                                    Creator tools
                                </a>
                            </li>
                            <li>
                                <a className="hover:text-white" href="/me">
                                    Profile
                                </a>
                            </li>
                            <li>
                                <a className="hover:text-white" href="/admin">
                                    Admin
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                            Safety
                        </div>
                        <ul className="mt-3 space-y-2 text-zinc-400">
                            <li>
                                <span className="text-zinc-400">
                                    SAFE is the default experience.
                                </span>
                            </li>
                            <li>
                                <span className="text-zinc-400">
                                    18+ is web-only and age-gated.
                                </span>
                            </li>
                            <li>
                                <span className="text-zinc-400">
                                    No minors, coercion, or sexual violence.
                                </span>
                            </li>
                            <li>
                                <a className="hover:text-white" href="/adult">
                                    Learn about gating
                                </a>
                            </li>
                        </ul>
                    </div>

                    <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
                            Support
                        </div>
                        <ul className="mt-3 space-y-2 text-zinc-400">
                            <li>
                                <a className="hover:text-white" href="/login">
                                    Login
                                </a>
                            </li>
                            <li>
                                <a className="hover:text-white" href="/auth/signout">
                                    Sign out
                                </a>
                            </li>
                            <li>
                                <a className="hover:text-white" href="/terms">
                                    Terms
                                </a>
                            </li>
                            <li>
                                <a className="hover:text-white" href="/privacy">
                                    Privacy
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

            </div>
        </footer>
    );
}
