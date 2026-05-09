// src/app/adult/page.tsx

import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export default async function AdultPage() {
  const user = await getAuthedUser();

  if (!user) {
    redirect("/login?next=/adult");
  }

  if (!isAdultAllowed(user)) {
    redirect("/adult/verify?next=/adult");
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-fuchsia-400">
              NOEMA
            </h1>
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
              Adaptive Companion Ecosystem
            </p>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
            <a href="/companions" className="transition hover:text-white">
              Companions
            </a>
            <a href="/adult" className="transition hover:text-pink-400">
              Adult
            </a>
            <a href="/create" className="transition hover:text-white">
              Create
            </a>
            <a href="/about" className="transition hover:text-white">
              About
            </a>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.18),transparent_60%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-28">
          <div className="max-w-4xl space-y-6">
            <div className="inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1 text-sm tracking-wide text-pink-300">
              Verified 18+ Ecosystem
            </div>

            <h2 className="text-6xl font-black tracking-tight">
              Noema Adult
            </h2>

            <p className="max-w-3xl text-lg leading-8 text-zinc-300">
              Noema is an AI companion platform focused on persistent memory,
              emotional continuity, evolving relationships, and immersive
              conversation.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-12 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold text-zinc-300">Noema AI</p>
            <p>Persistent memory. Adaptive relationships. Immersive AI.</p>
          </div>

          <div className="flex gap-6">
            <a href="/about" className="transition hover:text-white">
              About
            </a>
            <a href="/companions" className="transition hover:text-white">
              Companions
            </a>
            <a href="/adult" className="transition hover:text-pink-400">
              Adult
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
