"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function WorldJoinByCodeHandler({ code }: { code: string }) {
    const router = useRouter();
    const [status, setStatus] = useState<"joining" | "error">("joining");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function run() {
            const res = await fetch("/api/worlds/join-by-code", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ code }),
            });
            const data = await res.json().catch(() => null);

            if (cancelled) return;

            if (!res.ok) {
                setStatus("error");
                setError(data?.error || "Could not join world.");
                return;
            }

            router.replace(`/worlds/${data.world.slug}`);
            router.refresh();
        }

        run();
        return () => {
            cancelled = true;
        };
    }, [code, router]);

    if (status === "joining") {
        return (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-300">
                Joining world...
            </div>
        );
    }

    return (
        <div className="space-y-3 rounded-lg border border-zinc-800 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.18),transparent_55%)] p-4 text-sm">
            <div className="text-rose-300">{error || "Could not join world."}</div>
            <a
                href={`/worlds?code=${encodeURIComponent(code)}`}
                className="inline-flex h-10 items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 font-semibold text-zinc-200 transition hover:border-fuchsia-500/70 hover:text-white"
            >
                Open lobby
            </a>
        </div>
    );
}
