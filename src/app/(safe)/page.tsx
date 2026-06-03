import { getAuthedUser } from "@/lib/auth";
import { listCompanions } from "@/lib/companions";
import { isAdultAllowed } from "@/lib/ratings";
import {
  Wand2,
  Compass,
  Sparkles,
  Brain,
  Heart,
  Zap,
  Shield,
} from "lucide-react";
import { NoemaAvatarVideo } from "@/components/NoemaAvatarVideo";

const FEATURES = [
  {
    icon: Brain,
    title: "Persistent Memory",
    desc: "Companions remember every conversation, milestone, and emotional moment.",
  },
  {
    icon: Heart,
    title: "Emotional Continuity",
    desc: "Relationships evolve over time — familiarity, trust, and intimacy grow naturally.",
  },
  {
    icon: Zap,
    title: "Real-Time Media",
    desc: "Integrated AI image and video generation built into every conversation.",
  },
  {
    icon: Shield,
    title: "SAFE + Adult Ecosystem",
    desc: "Clean content separation with opt-in 18+ experiences for verified users.",
  },
];

export default async function SafePage() {
  const user = await getAuthedUser();
  const allowAdult = isAdultAllowed(user);

  const { items: featured } = await listCompanions({
    user,
    hasPhoto: true,
    page: 1,
    pageSize: 6,
    includeAdult: false,
  });

  return (
    <div className="space-y-12">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl pl-3 pr-6 py-14 sm:pl-4 sm:pr-10 sm:py-20"
        style={{
          background:
            "radial-gradient(ellipse 100% 140% at 50% -10%, rgba(160,100,255,0.20) 0%, transparent 65%), rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="flex items-center gap-8 sm:gap-12">
          {/* Avatar video — plays once on load */}
          <div className="hidden sm:flex shrink-0 w-[25%] items-center justify-start">
            <NoemaAvatarVideo src="/NoemaAvitar.mp4" />
          </div>

          {/* Text content */}
          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/[0.10] px-4 py-1.5 text-xs font-medium text-fuchsia-300 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Adaptive AI Companion Ecosystem
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              AI companions that{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #c084fc 0%, #818cf8 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                remember you
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-white/50">
              Noema companions build real memory — emotions, preferences,
              milestones, and relationship history — so every conversation feels
              personal and alive.
            </p>

            <div className="mt-8 flex flex-wrap justify-center sm:justify-start gap-3">
              <a
                href="/companions"
                className="inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-bold text-black hover:bg-white transition"
              >
                <Compass className="h-4 w-4" />
                Explore Companions
              </a>
              <a
                href="/companions/new"
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/[0.06] px-6 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white transition"
              >
                <Wand2 className="h-4 w-4" />
                Create Your Own
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Featured companions */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">
              Featured companions
            </h2>
            <a
              href="/companions"
              className="text-xs text-white/40 hover:text-white/70 transition"
            >
              View all →
            </a>
          </div>

          <div className="grid gap-3 grid-cols-3 sm:grid-cols-6">
            {featured.map((c) => {
              const chatHref = `/rpg?companion=${encodeURIComponent(c.slug)}`;
              return (
                <a
                  key={c.id}
                  href={chatHref}
                  className="group block overflow-hidden rounded-lg border border-white/[0.08] bg-[#0d0d1a] transition hover:-translate-y-0.5 hover:border-fuchsia-500/60"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-zinc-900">
                    {c.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbnailUrl}
                        alt={c.name}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
                        style={{ objectPosition: `${c.focalX}% ${c.focalY}%` }}
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-zinc-700">
                        {c.name.slice(0, 1)}
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <div className="truncate text-xs font-semibold text-white">
                        {c.name}
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Feature highlights */}
      <section>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl p-5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.07]">
                <Icon className="h-4.5 w-4.5 text-white/60" />
              </div>
              <h3 className="text-sm font-semibold text-white">{title}</h3>
              <p className="mt-1.5 text-xs leading-5 text-white/40">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section
        className="rounded-2xl px-6 py-10 text-center"
        style={{
          background:
            "radial-gradient(ellipse 80% 120% at 50% 100%, rgba(120,80,255,0.15) 0%, transparent 70%), rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Build your ideal companion.
        </h2>
        <p className="mt-3 text-sm text-white/40 max-w-md mx-auto">
          Design a personality, backstory, and relationship dynamic — then watch
          it evolve with every conversation.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href="/companions/new"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-6 py-2.5 text-sm font-bold text-black hover:bg-white transition"
          >
            <Wand2 className="h-4 w-4" />
            Start Creating
          </a>
          {!allowAdult && (
            <a
              href="/adult/verify"
              className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.05] px-6 py-2.5 text-sm font-semibold text-white/60 hover:text-white hover:bg-white/10 transition"
            >
              Unlock 18+ →
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
