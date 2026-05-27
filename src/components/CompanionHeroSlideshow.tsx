"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";

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

export function CompanionHeroSlideshow({ items }: { items: SlideItem[] }) {
    const [current, setCurrent] = useState(0);
    const [paused, setPaused] = useState(false);

    const next = useCallback(
        () => setCurrent((i) => (i + 1) % items.length),
        [items.length]
    );
    const prev = useCallback(
        () => setCurrent((i) => (i - 1 + items.length) % items.length),
        [items.length]
    );

    useEffect(() => {
        if (paused || items.length <= 1) return;
        const t = setTimeout(next, 5000);
        return () => clearTimeout(t);
    }, [current, paused, next, items.length]);

    if (!items.length) return null;

    return (
        <div
            className="group relative overflow-hidden rounded-2xl h-[260px] sm:h-[320px] lg:h-[360px]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            {items.map((item, i) => {
                const isAdult = item.contentRating === "ADULT";
                const chatHref = isAdult
                    ? `/adult/chat?companion=${encodeURIComponent(item.slug)}`
                    : `/chat?companion=${encodeURIComponent(item.slug)}`;
                const viewHref = isAdult
                    ? `/adult/companions/${encodeURIComponent(item.slug)}`
                    : `/companions/${encodeURIComponent(item.slug)}`;

                return (
                    <div
                        key={item.id}
                        className={`absolute inset-0 transition-opacity duration-700 ${
                            i === current ? "opacity-100" : "opacity-0 pointer-events-none"
                        }`}
                    >
                        {/* Background image */}
                        {item.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={item.thumbnailUrl}
                                alt={item.name}
                                className="absolute inset-0 h-full w-full object-cover"
                                style={{ objectPosition: `${item.focalX}% ${item.focalY}%` }}
                                loading={i === 0 ? "eager" : "lazy"}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] to-[#0d0d1a]" />
                        )}

                        {/* Gradient overlays */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

                        {/* Text content */}
                        <div className="absolute inset-0 flex flex-col justify-end p-5 sm:p-8 max-w-xl">
                            {isAdult && (
                                <span className="mb-2 self-start rounded-full bg-rose-600/80 px-2.5 py-0.5 text-[11px] font-bold text-white backdrop-blur-sm">
                                    18+
                                </span>
                            )}

                            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
                                {item.name}
                            </h2>

                            <p className="mt-2 text-sm text-white/60 line-clamp-2 leading-relaxed max-w-sm">
                                {item.description}
                            </p>

                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                                {item.tags.slice(0, 4).map((t) => (
                                    <span
                                        key={t}
                                        className="rounded-full border border-white/[0.15] bg-black/40 px-2.5 py-0.5 text-[11px] text-white/70 backdrop-blur-sm"
                                    >
                                        {t}
                                    </span>
                                ))}
                            </div>

                            <div className="mt-4 flex gap-2">
                                <a
                                    href={chatHref}
                                    className="flex h-9 items-center gap-1.5 rounded-full bg-white/90 px-5 text-xs font-bold text-black hover:bg-white transition"
                                >
                                    <MessageSquare className="h-3.5 w-3.5" />
                                    Chat now
                                </a>
                                <a
                                    href={viewHref}
                                    className="flex h-9 items-center rounded-full border border-white/[0.20] bg-white/[0.08] px-5 text-xs font-semibold text-white/80 hover:bg-white/[0.15] hover:text-white transition backdrop-blur-sm"
                                >
                                    View profile
                                </a>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Prev / Next arrows */}
            {items.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        aria-label="Previous"
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.15] bg-black/50 text-white/60 backdrop-blur-sm transition hover:bg-black/70 hover:text-white opacity-0 group-hover:opacity-100"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={next}
                        aria-label="Next"
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.15] bg-black/50 text-white/60 backdrop-blur-sm transition hover:bg-black/70 hover:text-white opacity-0 group-hover:opacity-100"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </>
            )}

            {/* Dot + progress indicators */}
            {items.length > 1 && (
                <div className="absolute bottom-4 right-5 z-10 flex items-center gap-1.5">
                    {items.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setCurrent(i)}
                            aria-label={`Slide ${i + 1}`}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                i === current
                                    ? "w-6 bg-white"
                                    : "w-1.5 bg-white/30 hover:bg-white/60"
                            }`}
                        />
                    ))}
                </div>
            )}

            {/* Slide counter top-right */}
            {items.length > 1 && (
                <div className="absolute top-4 right-5 z-10 rounded-full bg-black/40 px-2.5 py-1 text-[11px] text-white/50 backdrop-blur-sm">
                    {current + 1} / {items.length}
                </div>
            )}
        </div>
    );
}
