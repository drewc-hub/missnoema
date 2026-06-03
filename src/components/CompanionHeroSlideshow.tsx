"use client";

import { useCallback, useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    Compass,
    MessageSquare,
    Sparkles,
} from "lucide-react";

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

type VideoSlide = {
    type: "video";
    id: string;
    src: string;
    title: string;
};

type FilmSlide =
    | { type: "banner" }
    | VideoSlide
    | (SlideItem & { type: "companion" });

function BannerSlide() {
    return (
        <div className="relative flex h-full w-full items-center overflow-hidden">
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


            <img
                src="/images/companion-banner.png"
                alt="Companion banner"
                className="absolute right-0 z-30 h-full w-auto object-contain pointer-events-none"
            />

            <div className="relative z-10 flex h-full w-[52%] flex-col justify-center px-5 sm:w-[48%] sm:px-8">
                <div className="mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-fuchsia-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400/80">
                        Noema AI
                    </span>
                </div>

                <h2 className="text-lg font-black leading-snug text-white sm:text-xl lg:text-2xl">
                    Meet your perfect
                    <br />
                    <span
                        style={{
                            background: "linear-gradient(135deg, #67e8f9 0%, #34d399 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        AI companion
                    </span>
                </h2>

                <p className="mt-1.5 max-w-[220px] text-[11px] leading-relaxed text-white/40">
                    Persistent memory · emotional continuity · evolving relationships
                </p>

                <div className="mt-3 flex gap-2">
                    <a
                        href="/companions"
                        className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-4 text-xs font-bold text-black transition hover:bg-white"
                    >
                        <Compass className="h-3 w-3" />
                        Explore
                    </a>
                    <a
                        href="/companions/new"
                        className="flex h-8 items-center rounded-full border border-white/[0.18] bg-white/[0.05] px-4 text-xs font-semibold text-white/65 transition hover:bg-white/[0.10] hover:text-white"
                    >
                        Create
                    </a>
                </div>
            </div>
        </div>
    );
}

function FeatureVideoSlide({ slide }: { slide: VideoSlide }) {
    return (
        <div className="relative h-full w-full overflow-hidden bg-black">
            <video
                src={slide.src}
                aria-label={slide.title}
                className="h-full w-full object-cover"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
            />
        </div>
    );
}

function CompanionSlide({
    item,
    feature,
}: {
    item: SlideItem;
    feature: string;
}) {
    const isAdult = item.contentRating === "ADULT";
    const chatHref = isAdult
        ? `/adult/chat?companion=${encodeURIComponent(item.slug)}`
        : `/chat?companion=${encodeURIComponent(item.slug)}`;
    const viewHref = isAdult
        ? `/adult/companions/${encodeURIComponent(item.slug)}`
        : `/companions/${encodeURIComponent(item.slug)}`;

    return (
        <div className="relative flex h-full w-full items-center">
            <div className="relative z-10 flex h-full w-full flex-col justify-center px-5 sm:px-8">
                <div className="mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-fuchsia-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-400/80">
                        Noema AI
                    </span>
                    {isAdult && (
                        <span className="ml-1 rounded-full bg-rose-600/70 px-1.5 py-px text-[9px] font-bold text-white">
                            18+
                        </span>
                    )}
                </div>

                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/35 sm:text-[11px]">
                    {feature}
                </p>

                <h2 className="truncate text-lg font-black leading-tight text-white sm:text-xl lg:text-2xl">
                    {item.name}
                </h2>

                <div className="mt-1.5 flex flex-wrap gap-1">
                    {item.tags.slice(0, 3).map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full border border-white/[0.10] bg-white/[0.04] px-2 py-px text-[10px] text-white/50"
                        >
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-3 flex gap-2">
                    <a
                        href={chatHref}
                        className="flex h-8 items-center gap-1.5 rounded-full bg-white/90 px-4 text-xs font-bold text-black transition hover:bg-white"
                    >
                        <MessageSquare className="h-3 w-3" />
                        Chat now
                    </a>
                    <a
                        href={viewHref}
                        className="flex h-8 items-center rounded-full border border-white/[0.18] bg-white/[0.05] px-4 text-xs font-semibold text-white/65 transition hover:bg-white/[0.10] hover:text-white"
                    >
                        View
                    </a>
                </div>
            </div>
        </div>
    );
}

export function CompanionHeroSlideshow({ items }: { items: SlideItem[] }) {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);
    const [animate, setAnimate] = useState(true);

    const allSlides: FilmSlide[] = [
        { type: "banner" },
        {
            type: "video",
            id: "other-feats",
            src: "/images/other-feats.mp4",
            title: "Noema AI features",
        },
        ...items.map((item) => ({ ...item, type: "companion" as const })),
    ];

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
        const timer = setTimeout(next, 5000);
        return () => clearTimeout(timer);
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
            className="group relative h-[190px] overflow-hidden rounded-2xl border border-white/[0.07] sm:h-[220px] lg:h-[250px]"
            style={{ background: "#07070f" }}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="pointer-events-none absolute inset-0 z-0 slideshow-grid" />

            <div
                className="absolute inset-0 pointer-events-none z-0"
                style={{
                    background:
                        "radial-gradient(ellipse 55% 120% at 80% 50%, rgba(168,85,247,0.10) 0%, transparent 70%)",
                }}
            />

            <div
                className="flex h-full"
                style={{
                    width: `${filmCount * 100}%`,
                    transform: `translateX(-${(current / filmCount) * 100}%)`,
                    transition: animate
                        ? "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
                        : "none",
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                {extendedSlides.map((slide, index) => (
                    <div
                        key={`${slide.type}-${index}`}
                        className="relative h-full"
                        style={{ width: `${100 / filmCount}%`, flexShrink: 0 }}
                    >
                        {slide.type === "banner" ? (
                            <BannerSlide />
                        ) : slide.type === "video" ? (
                            <FeatureVideoSlide slide={slide} />
                        ) : (
                            <CompanionSlide
                                item={slide}
                                feature={NOEMA_FEATURES[(index - 2) % NOEMA_FEATURES.length]}
                            />
                        )}
                    </div>
                ))}
            </div>

            {totalReal > 1 && (
                <>
                    <button
                        onClick={prev}
                        aria-label="Previous"
                        className="absolute left-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.15] bg-black/60 text-white/50 opacity-0 backdrop-blur-sm transition hover:bg-black/80 hover:text-white group-hover:opacity-100"
                    >
                        <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    <button
                        onClick={next}
                        aria-label="Next"
                        className="absolute right-2 top-1/2 z-20 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.15] bg-black/60 text-white/50 opacity-0 backdrop-blur-sm transition hover:bg-black/80 hover:text-white group-hover:opacity-100"
                    >
                        <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                </>
            )}

            {totalReal > 1 && (
                <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5">
                    {allSlides.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => {
                                setAnimate(true);
                                setCurrent(index);
                            }}
                            aria-label={`Slide ${index + 1}`}
                            className={`h-1 rounded-full transition-all duration-300 ${index === activeDot
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
