// app/hooks/useTheme.ts
"use client";
import { setGameContext as setFaviconContext } from "@/components/useFavicon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

const BORDER_RADIUS_MAP = {
    sharp: "0px",
    rounded: "12px",
    soft: "24px",
} as const;

export type BorderRadiusStyle = keyof typeof BORDER_RADIUS_MAP;
export type CardStyle =
    | "clean"
    | "grungy"
    | "tech"
    | "parchment"
    | "metallic"
    | "wooden";

export interface ThemeConfig {
    bgColor: string;
    bgSecondary: string;
    bgElevated: string;
    textColor: string;
    textMuted: string;
    accentColor: string;
    accentHover: string;
    borderColor: string;
    successColor: string;
    warningColor: string;
    dangerColor: string;
    codeBackground: string;
    codeText: string;
    borderRadius: BorderRadiusStyle;
    cardStyle: CardStyle;
    fontDisplay: string;
    fontBody: string;
    fontMono: string;
    showHealthBars: boolean;
    showConditionTags: boolean;
    showImages: boolean;
    appTitle: string;
}

export const defaultConfig: ThemeConfig = {
    bgColor: "#0f0f1a",
    bgSecondary: "#1a1a2e",
    bgElevated: "#252545",
    textColor: "#f0f0f5",
    textMuted: "#9090a0",
    accentColor: "#7c3aed",
    accentHover: "#8b5cf6",
    borderColor: "#3a3a5c",
    successColor: "#22c55e",
    warningColor: "#f59e0b",
    dangerColor: "#ef4444",
    codeBackground: "#0a0a12",
    codeText: "#a5f3a0",
    borderRadius: "rounded",
    cardStyle: "clean",
    fontDisplay: "Inter",
    fontBody: "Inter",
    fontMono: "JetBrains Mono",
    showHealthBars: true,
    showConditionTags: true,
    showImages: true,
    appTitle: "DMCP Game Viewer",
};

const systemFonts = [
    "system-ui",
    "sans-serif",
    "serif",
    "monospace",
    "cursive",
    "fantasy",
];

function hexToRgb(hex: string): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result?.[1] && result?.[2] && result?.[3]) {
        return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(
            result[3],
            16,
        )}`;
    }
    return "124, 58, 237";
}

async function fetchTheme(gameId?: string | null): Promise<ThemeConfig | null> {
    try {
        const url = gameId ? `/api/games/${gameId}/theme` : "/api/theme";
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) return null;
        return (await response.json()) as ThemeConfig;
    } catch {
        return null;
    }
}

export function useTheme() {
    const params = useParams<{ gameId?: string | string[] }>();
    const gameId = useMemo(() => {
        const value = params?.gameId;
        return Array.isArray(value) ? value[0] : value ?? null;
    }, [params]);

    const [config, setConfig] = useState<ThemeConfig>(defaultConfig);
    const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
    const currentSessionIdRef = useRef<string | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const loadingFontsRef = useRef<Set<string>>(new Set());

    const loadGoogleFont = useCallback(
        async (fontName: string): Promise<void> => {
            if (
                !fontName ||
                loadedFonts.has(fontName) ||
                loadingFontsRef.current.has(fontName)
            ) {
                return;
            }

            if (systemFonts.some((font) => fontName.toLowerCase().includes(font))) {
                return;
            }

            loadingFontsRef.current.add(fontName);

            try {
                const encodedFont = encodeURIComponent(fontName);
                const linkId = `google-font-${encodedFont}`;

                if (document.getElementById(linkId)) {
                    setLoadedFonts((prev) => new Set(prev).add(fontName));
                    loadingFontsRef.current.delete(fontName);
                    return;
                }

                const link = document.createElement("link");
                link.id = linkId;
                link.rel = "stylesheet";
                link.href = `https://fonts.googleapis.com/css2?family=${encodedFont.replace(
                    /%20/g,
                    "+",
                )}:wght@400;500;600;700&display=swap`;

                await new Promise<void>((resolve, reject) => {
                    link.onload = () => resolve();
                    link.onerror = () =>
                        reject(new Error(`Failed to load font: ${fontName}`));
                    document.head.appendChild(link);
                });

                setLoadedFonts((prev) => new Set(prev).add(fontName));
            } catch (error) {
                console.warn(`Could not load Google Font "${fontName}":`, error);
            } finally {
                loadingFontsRef.current.delete(fontName);
            }
        },
        [loadedFonts],
    );

    const loadThemeFonts = useCallback(
        async (theme: ThemeConfig) => {
            const fonts = [theme.fontDisplay, theme.fontBody, theme.fontMono].filter(Boolean);
            await Promise.all(fonts.map(loadGoogleFont));
        },
        [loadGoogleFont],
    );

    const applyTheme = useCallback((theme: ThemeConfig) => {
        const root = document.documentElement;

        root.style.setProperty("--bg", theme.bgColor);
        root.style.setProperty("--bg-secondary", theme.bgSecondary);
        root.style.setProperty("--bg-elevated", theme.bgElevated);
        root.style.setProperty("--text", theme.textColor);
        root.style.setProperty("--text-muted", theme.textMuted);
        root.style.setProperty("--accent", theme.accentColor);
        root.style.setProperty("--accent-hover", theme.accentHover);
        root.style.setProperty("--border", theme.borderColor);
        root.style.setProperty("--success", theme.successColor);
        root.style.setProperty("--warning", theme.warningColor);
        root.style.setProperty("--danger", theme.dangerColor);
        root.style.setProperty("--code-bg", theme.codeBackground);
        root.style.setProperty("--code-text", theme.codeText);

        root.style.setProperty("--accent-rgb", hexToRgb(theme.accentColor));
        root.style.setProperty("--bg-rgb", hexToRgb(theme.bgColor));

        root.style.setProperty(
            "--border-radius",
            BORDER_RADIUS_MAP[theme.borderRadius] ?? "12px",
        );
        root.style.setProperty(
            "--border-radius-sm",
            theme.borderRadius === "sharp" ? "0px" : "6px",
        );
        root.style.setProperty(
            "--border-radius-lg",
            theme.borderRadius === "sharp"
                ? "0px"
                : theme.borderRadius === "soft"
                    ? "32px"
                    : "16px",
        );

        root.setAttribute("data-card-style", theme.cardStyle);

        const fontDisplay = theme.fontDisplay
            ? `'${theme.fontDisplay}', system-ui, sans-serif`
            : "system-ui, sans-serif";
        const fontBody = theme.fontBody
            ? `'${theme.fontBody}', system-ui, sans-serif`
            : "system-ui, sans-serif";
        const fontMono = theme.fontMono
            ? `'${theme.fontMono}', 'Fira Code', monospace`
            : "'JetBrains Mono', 'Fira Code', monospace";

        root.style.setProperty("--font-display", fontDisplay);
        root.style.setProperty("--font-body", fontBody);
        root.style.setProperty("--font-mono", fontMono);

        root.style.setProperty("--font-family", fontBody);
        root.style.setProperty("--ascii-font", fontMono);
        root.style.setProperty("--ascii-bg", theme.codeBackground);
        root.style.setProperty("--ascii-text", theme.codeText);

        document.body.style.fontFamily = fontBody;

        root.setAttribute("data-show-health-bars", String(theme.showHealthBars));
        root.setAttribute(
            "data-show-condition-tags",
            String(theme.showConditionTags),
        );
        root.setAttribute("data-show-images", String(theme.showImages));

        if (theme.appTitle) {
            document.title = theme.appTitle;
        }
    }, []);

    const loadTheme = useCallback(
        async (nextGameId?: string | null) => {
            let serverTheme: ThemeConfig | null = null;

            if (nextGameId) {
                serverTheme = await fetchTheme(nextGameId);
            }

            if (!serverTheme) {
                serverTheme = await fetchTheme(null);
            }

            const nextConfig = serverTheme
                ? { ...defaultConfig, ...serverTheme }
                : { ...defaultConfig };

            setConfig(nextConfig);
            await loadThemeFonts(nextConfig);
            applyTheme(nextConfig);
        },
        [applyTheme, loadThemeFonts],
    );

    const stopPolling = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
    }, []);

    const startPolling = useCallback(
        (intervalMs = 5000) => {
            if (pollingRef.current) return;

            pollingRef.current = setInterval(async () => {
                const serverTheme = await fetchTheme(currentSessionIdRef.current);
                if (!serverTheme) return;

                const nextConfig = { ...defaultConfig, ...serverTheme };
                const changed =
                    JSON.stringify(nextConfig) !== JSON.stringify(config);

                if (!changed) return;

                setConfig(nextConfig);
                await loadThemeFonts(nextConfig);
                applyTheme(nextConfig);
            }, intervalMs);
        },
        [applyTheme, config, loadThemeFonts],
    );

    const setGameContext = useCallback(
        (nextGameId: string | null) => {
            if (nextGameId === currentSessionIdRef.current) return;
            currentSessionIdRef.current = nextGameId;
            void loadTheme(nextGameId);
            setFaviconContext(nextGameId);
        },
        [loadTheme],
    );

    useEffect(() => {
        currentSessionIdRef.current = gameId;
        void loadTheme(gameId);
        startPolling();

        return () => {
            stopPolling();
        };
    }, [gameId, loadTheme, startPolling, stopPolling]);

    useEffect(() => {
        setGameContext(gameId);
    }, [gameId, setGameContext]);

    useEffect(() => {
        void loadThemeFonts(config);
        applyTheme(config);
    }, [applyTheme, config, loadThemeFonts]);

    return {
        config,
        loadTheme: () => loadTheme(currentSessionIdRef.current),
        setGameContext,
        startPolling,
        stopPolling,
        defaultConfig,
        loadedFonts,
        gameId,
    };
}
