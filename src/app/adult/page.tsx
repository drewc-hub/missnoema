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
      <section className="relative overflow-hidden border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(236,72,153,0.22),transparent_55%)]" />

        <div className="relative mx-auto max-w-7xl px-6 py-24">
          <div className="max-w-4xl space-y-6">
            <div className="inline-flex rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-1 text-sm tracking-wide text-pink-300">
              Verified 18+ Companion Ecosystem
            </div>

            <h1 className="text-5xl font-black tracking-tight sm:text-6xl">
              Noema Adult
            </h1>

            <p className="max-w-3xl text-lg leading-8 text-zinc-300">
              Noema is an AI companion platform focused on persistent memory,
              emotional continuity, evolving relationships, and immersive
              conversation. Companions remember your history, adapt to your
              personality, and grow over time through advanced relationship and
              emotional modeling systems.
            </p>

            <p className="max-w-3xl text-lg leading-8 text-zinc-400">
              Featuring dynamic AI-generated media, customizable companions, and
              both SAFE and adult-gated experiences, Noema is designed to feel
              less like a chatbot and more like a living digital relationship
              ecosystem.
            </p>

            <div className="flex flex-wrap gap-4 pt-4">
              <Link
                href="/adult/companions"
                className="rounded-2xl bg-pink-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-pink-400"
              >
                Enter Adult Library
              </Link>

              <Link
                href="/companions"
                className="rounded-2xl border border-zinc-700 bg-zinc-900/70 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-pink-500 hover:text-white"
              >
                Back to SAFE Library
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Persistent Memory",
              desc: "Companions remember emotional moments, preferences, relationship history, and ongoing context.",
            },
            {
              title: "Adult Media Generation",
              desc: "Create immersive companion images and videos inside a verified adult-only experience.",
            },
            {
              title: "Evolving Relationship Engine",
              desc: "Trust, familiarity, intimacy, mood, and emotional state shape every interaction over time.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-3xl border border-zinc-800 bg-zinc-950 p-7 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white">{item.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-400">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
