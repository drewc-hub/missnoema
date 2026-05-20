import { getAuthedUser } from "@/lib/auth";
import { listCompanions } from "@/lib/companions";
import { isAdultAllowed } from "@/lib/ratings";
import { MessageSquare, Wand2, Compass, Sparkles, Brain, Heart, Zap, Shield } from "lucide-react";

const FEATURES = [
  { icon: Brain, title: "Persistent Memory", desc: "Companions remember every conversation, milestone, and emotional moment." },
  { icon: Heart, title: "Emotional Continuity", desc: "Relationships evolve over time — familiarity, trust, and intimacy grow naturally." },
  { icon: Zap, title: "Real-Time Media", desc: "Integrated AI image and video generation built into every conversation." },
  { icon: Shield, title: "SAFE + Adult Ecosystem", desc: "Clean content separation with opt-in 18+ experiences for verified users." },
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
        className="relative overflow-hidden rounded-2xl px-6 py-14 sm:px-10 sm:py-20"
        style={{
          background:
            "radial-gradient(ellipse 100% 140% at 50% -10%, rgba(160,100,255,0.20) 0%, transparent 65%), rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/[0.10] px-4 py-1.5 text-xs font-medium text-fuchsia-300 mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Adaptive AI Companion Ecosystem
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
            AI companions that{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #c084fc 0%, #818cf8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              remember you
            </span>
          </h1>

          <p className="mt-5 max-w-xl mx-auto text-base leading-7 text-white/50">
            Noema companions build real memory — emotions, preferences, milestones, and
            relationship history — so every conversation feels personal and alive.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
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
      </section>

      {/* Featured companions */}
      {featured.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Featured companions</h2>
            <a href="/companions" className="text-xs text-white/40 hover:text-white/70 transition">
              View all →
            </a>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {featured.map((c) => {
              const viewHref = `/companions/${encodeURIComponent(c.slug)}`;
              const chatHref = `/chat?companion=${encodeURIComponent(c.slug)}`;
              return (
                <div
                  key={c.id}
                  className="group relative overflow-hidden rounded-xl border border-white/[0.08] bg-[#0d0d1a] transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-black/50"
                  style={{ aspectRatio: "188/330" }}
                >
                  {/* Clickable image area → companion profile */}
                  <a href={viewHref} className="absolute inset-0 block">
                    {c.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbnailUrl}
                        alt={c.name}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] text-4xl font-black text-white/10 select-none">
                        {c.name[0]}
                      </div>
                    )}
                  </a>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0d0d1a] via-[#0d0d1a]/40 to-transparent" />
                  <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-3">
                    <div className="truncate text-sm font-semibold text-white leading-tight">{c.name}</div>
                  </div>
                  {/* Chat button sits above the gradient, pointer-events re-enabled */}
                  <div className="absolute bottom-3 left-3 right-3 opacity-0 translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
                    <a
                      href={chatHref}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-[20px] bg-white/90 text-xs font-bold text-black hover:bg-white transition"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Chat
                    </a>
                  </div>
                </div>
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
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
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
          background: "radial-gradient(ellipse 80% 120% at 50% 100%, rgba(120,80,255,0.15) 0%, transparent 70%), rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Build your ideal companion.
        </h2>
        <p className="mt-3 text-sm text-white/40 max-w-md mx-auto">
          Design a personality, backstory, and relationship dynamic — then watch it evolve with every conversation.
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
