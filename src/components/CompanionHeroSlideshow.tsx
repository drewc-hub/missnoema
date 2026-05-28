"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Sparkles, Compass } from "lucide-react";

const NOEMA_FEATURES = [
    "Emotional continuity & real memory",
    "Real-time image & video generation",
    "Relationships that evolve over time",
    "Design your perfect companion",
    "SAFE & adult ecosystem",
    "AI companions that remember you",
];

type SlideItem = {
    id: string;
    name: string;
    slug: string;
    description: string;
    tags: string[];
    contentRating: "SAFE" | "ADULT";
    thumbnailUrl: string | null;
    focalX: number;
    focalY: number;
};

const items = [
    {
        id: "1",
        name: "Sister-Seraphine-Voss",
        slug: "sister-seraphine-voss",
        description: "Companion",
        tags: ["Nun", "Dominant"],
        contentRating: "ADULT" as const,
        thumbnailUrl: "/images/sister-thumb.png",
        bannerUrl: null,
        overlayImageUrl: null,
        focalX: 50,
        focalY: 50,
    },
];

type FilmSlide = { type: "banner" } | (SlideItem & { type: "companion" });

// ─── Banner slide (intro) ──────────────────────────────────────────────────
function BannerSlide({ photos }: { photos: SlideItem[] }) {
    const shown = photos.slice(0, 4);

    return (
        <div className="relative flex h-full w-full items-center overflow-hidden">
            {/* Teal gradient band — mid layer */}
            <div
                className="absolute inset-0 pointer-events-none z-[1]"
                style={{
                    background: `
                        linear-gradient(
                            to bottom,
                            rgba(0, 0, 0, 0) 0%,
                            rgba(4, 20, 38, 0.18) 8%,
                            rgba(6, 37, 66, 0.52) 24%,
                            rgba(8, 72, 94, 0.65) 50%,
                            rgba(6, 37, 66, 0.52) 76%,
                            rgba(4, 20, 38, 0.18) 92%,
                            rgba(0, 0, 0, 0) 100%
                        )
                    `,
                }}
            />

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/sister-thumb.png" alt=""
                className="absolute right-0 z-30 h-full w-auto object-contain pointer-events-none" />

            {/* Left: NoemaAI branding */}
            <div className="relative z-10 flex flex-col justify-center h-full px-5 sm:px-8 w-[52%] sm:w-[48%]">
                <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3 w-3 text-fuchsia-400" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-fuchsia-400/80">
                        Noema AI
                    </span>
                </div>

                <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white leading-snug">
                    AI companions that<br />
                    <span
                        style={{
                            background: "linear-gradient(135deg, #c084fc 0%, #67e8f9 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        remember you
                    </span>
                </h2>

                <p className="mt-1.5 text-[11px] text-white/40 leading-relaxed max-w-[200px]">
                    Persistent memory · emotional continuity · evolving relationships
                </p>

                <div className="mt-3 flex gap-2">
                    <a
                        href="/companions"
                        className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-4 text-xs font-bold text-black hover:bg-white transition"
                    >
                        <Compass className="h-3 w-3" />
                        Explore
                    </a>
                    <a
                        href="/companions/new"
                        className="flex h-8 items-center rounded-full border border-white/[0.18] bg-white/[0.05] px-4 text-xs font-semibold text-white/65 hover:bg-white/[0.10] hover:text-white transition"
                    >
                        Create
                    </a>
                </div>
            </div>

            {/* Right: floating companion photo cards — top layer */}
            <div className="absolute right-3 sm:right-6 top-0 h-full z-10 flex items-end gap-2 sm:gap-3 pb-3">
                {shown.map((item, idx) => {
                    const isAdult = item.contentRating === "ADULT";
                    const chatHref = isAdult
                        ? `/adult/chat?companion=${encodeURIComponent(item.slug)}`
                        : `/chat?companion=${encodeURIComponent(item.slug)}`;

                    // stagger heights: outer cards shorter, middle taller
                    const heights = ["72%", "88%", "80%", "68%"];
                    const bottoms = ["0px", "0px", "0px", "0px"];
                    const h = heights[idx] ?? "76%";
                    const b = bottoms[idx] ?? "0px";

                    return (
                        <a
                            key={item.id}
                            href={chatHref}
                            className="group/card relative flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.15] hover:border-fuchsia-400/50 transition-all duration-300 hover:-translate-y-1 shadow-xl shadow-black/50"
                            style={{
                                width: "clamp(52px, 8vw, 78px)",
                                height: h,
                                marginBottom: b,
                                alignSelf: "flex-end",
                            }}
                        >
                            {item.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={item.thumbnailUrl}
                                    alt={item.name}
                                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.06]"
                                    style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
                                    loading="lazy"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] to-[#0d0d1a] text-xl font-black text-white/10">
                                    {item.name[0]}
                                </div>
                            )}
                            {/* Name label */}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                                <div className="truncate text-[9px] font-semibold text-white">{item.name}</div>
                            </div>
                            {isAdult && (
                                <div className="absolute top-1 left-1 rounded-full bg-rose-600/80 px-1 py-px text-[8px] font-bold text-white leading-tight">
                                    18+
                                </div>
                            )}
                        </a>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Single companion slide ────────────────────────────────────────────────
function CompanionSlide({ item, feature, slideCount }: { item: SlideItem; feature: string; slideCount: number }) {
    const isAdult = item.contentRating === "ADULT";
    const chatHref = isAdult
        ? `/adult/chat?companion=${encodeURIComponent(item.slug)}`
        : `/chat?companion=${encodeURIComponent(item.slug)}`;
    const viewHref = isAdult
        ? `/adult/companions/${encodeURIComponent(item.slug)}`
        : `/companions/${encodeURIComponent(item.slug)}`;

    return (
        <div className="relative flex h-full w-full items-center">
            {/* Portrait — right side */}
            <div
                className="absolute right-0 top-0 h-full"
                style={{ width: slideCount <= 3 ? "50%" : "44%" }}
            >
                {item.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={item.thumbnailUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
                        loading="lazy"
                    />
                ) : (
                    <div className="h-full w-full bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a]" />
                )}
                <div
                    className="absolute inset-0"
                    style={{ background: "linear-gradient(to right, #07070f 0%, transparent 45%)" }}
                />
            </div>

            {/* Text — left side */}
            <div className="relative z-10 flex flex-col justify-center h-full px-5 sm:px-8 w-[58%] sm:w-[55%]">
                <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3 w-3 text-fuchsia-400" />
                    <span className="text-[10px] font-bold tracking-widest uppercase text-fuchsia-400/80">
                        Noema AI
                    </span>
                    {isAdult && (
                        <span className="ml-1 rounded-full bg-rose-600/70 px-1.5 py-px text-[9px] font-bold text-white">
                            18+
                        </span>
                    )}
                </div>

                <p className="text-[10px] sm:text-[11px] text-white/35 uppercase tracking-wider mb-1.5 leading-tight">
                    {feature}
                </p>

                <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-white leading-tight truncate">
                    {item.name}
                </h2>

                <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((t) => (
                        <span
                            key={t}
                            className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-px text-[10px] text-white/50"
                        >
                            {t}
                        </span>
                    ))}
                </div>

                <div className="mt-3 flex gap-2">
                    <a
                        href={chatHref}
                        className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-4 text-xs font-bold text-black hover:bg-white transition"
                    >
                        <MessageSquare className="h-3 w-3" />
                        Chat now
                    </a>
                    <a
                        href={viewHref}
                        className="flex h-8 items-center rounded-full border border-white/[0.18] bg-white/[0.05] px-4 text-xs font-semibold text-white/65 hover:bg-white/[0.10] hover:text-white transition"
                    >
                        View
                    </a>
                </div>
            </div>
        </div>
    );
}

// ─── Main slideshow ────────────────────────────────────────────────────────
export function CompanionHeroSlideshow({ items }: { items: SlideItem[] }) {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const [animate, setAnimate] = useState(true);

    // allSlides: banner + individual companion slides
    const allSlides: FilmSlide[] = [
        { type: "banner" },
        ...items.map((item): FilmSlide => ({ ...item, type: "companion" })),
    ];
    // extendedSlides: append ghost copy of slide[0] (banner) for seamless loop
    const extendedSlides: FilmSlide[] = [...allSlides, { type: "banner" }];
    const totalReal = allSlides.length;
    const filmCount = extendedSlides.length;

    const next = useCallback(() => {
        if (totalReal <= 1) return;
        setAnimate(true);
        setCurrent((i) => i + 1);
    }, [totalReal]);

    const prev = useCallback(() => {
        if (totalReal <= 1) return;
        setAnimate(true);
        setCurrent((i) => (i - 1 + totalReal) % totalReal);
    }, [totalReal]);

    useEffect(() => {
        if (paused || totalReal <= 1) return;
        const t = setTimeout(next, 5000);
        return () => clearTimeout(t);
    }, [current, paused, next, totalReal]);

    const handleTransitionEnd = useCallback(() => {
        if (current === totalReal) {
            setAnimate(false);
            setCurrent(0);
        }
    }, [current, totalReal]);

    useEffect(() => {
        if (!animate) {
            const id = requestAnimationFrame(() => {
                requestAnimationFrame(() => setAnimate(true));
            });
            return () => cancelAnimationFrame(id);
        }
    }, [animate]);

    if (!items.length) return null;

    const activeDot = current === totalReal ? 0 : current;

    return (
        <div
            className="group relative overflow-hidden rounded-2xl border border-white/[0.07] h-[190px] sm:h-[220px] lg:h-[250px]"
            style={{ background: "#07070f" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {/* Animated grid lines */}
            <div className="absolute inset-0 slideshow-grid pointer-events-none z-0" />

            {/* Purple radial glow */}
            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 55% 120% at 80% 50%, rgba(168,85,247,0.10) 0%, transparent 70%)",
                }}
            />

            {/* Filmstrip */}
            <div
                className="flex h-full"
                style={{
                    width: `${filmCount * 100}%`,
                    transform: `translateX(-${(current / filmCount) * 100}%)`,
                    transition: animate ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                {extendedSlides.map((slide, i) => (
                    <div
                        key={i}
                        className="relative h-full"
                        style={{ width: `${100 / filmCount}%`, flexShrink: 0 }}
                    >
                        {slide.type === "banner" ? (
                            <BannerSlide photos={items} />
                        ) : (
                            <CompanionSlide
                                item={slide}
                                feature={NOEMA_FEATURES[(i - 1) % NOEMA_FEATURES.length]}
                                slideCount={totalReal}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Arrows */}
            {totalReal > 1 && (
                <>
                    <button
                        onClick={prev}
                        aria-label="Previous"
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.15] bg-black/60 text-white/50 backdrop-blur-sm transition hover:bg-black/80 hover:text-white opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next"
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.15] bg-black/60 text-white/50 backdrop-blur-sm transition hover:bg-black/80 hover:text-white opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </>
            )}

            {/* Dots */}
            {totalReal > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
                    {allSlides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { setAnimate(true); setCurrent(i); }}
                            aria-label={`Slide ${i + 1}`}
                            className={`h-1 rounded-full transition-all duration-300 ${i === activeDot
                                ? "w-5 bg-fuchsia-400"
                                : "w-1 bg-white/20 hover:bg-white/50"
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
