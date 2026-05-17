// app/hooks/useFavicon.ts
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";

const DEFAULT_FAVICON =
    'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎲</text></svg>';

function getFaviconLink(): HTMLLinkElement {
    let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');

    if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/png";
        document.head.appendChild(link);
    }

    return link;
}

export function setGameContext(gameId: string | null): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
        new CustomEvent("app:set-favicon-game-context", {
            detail: { gameId },
        }),
    );
}

export function useFavicon() {
    const params = useParams<{ gameId?: string | string[] }>();

    const gameId = useMemo(() => {
        const value = params?.gameId;
        return Array.isArray(value) ? value[0] : value ?? null;
    }, [params]);

    const [currentFaviconUrl, setCurrentFaviconUrl] = useState<string | null>(null);
    const currentGameIdRef = useRef<string | null>(null);

    const setFavicon = useCallback((url: string) => {
        const link = getFaviconLink();
        link.href = url;
        setCurrentFaviconUrl(url);
    }, []);

    const resetFavicon = useCallback(() => {
        setFavicon(DEFAULT_FAVICON);
    }, [setFavicon]);

    const loadGameFavicon = useCallback(
        async (nextGameId: string | null): Promise<void> => {
            if (!nextGameId) {
                resetFavicon();
                return;
            }

            try {
                const url = `/api/games/${nextGameId}/favicon?size=32`;
                const response = await fetch(url, { method: "HEAD", cache: "no-store" });

                if (response.ok) {
                    setFavicon(`${url}&t=${Date.now()}`);
                    return;
                }

                resetFavicon();
            } catch {
                resetFavicon();
            }
        },
        [resetFavicon, setFavicon],
    );

    const reloadFavicon = useCallback(() => {
        return loadGameFavicon(currentGameIdRef.current);
    }, [loadGameFavicon]);

    useEffect(() => {
        function onSetContext(event: Event) {
            const customEvent = event as CustomEvent<{ gameId: string | null }>;
            const nextGameId = customEvent.detail?.gameId ?? null;

            if (nextGameId === currentGameIdRef.current) return;

            currentGameIdRef.current = nextGameId;
            void loadGameFavicon(nextGameId);
        }

        window.addEventListener("app:set-favicon-game-context", onSetContext);

        return () => {
            window.removeEventListener("app:set-favicon-game-context", onSetContext);
        };
    }, [loadGameFavicon]);

    useEffect(() => {
        currentGameIdRef.current = gameId;
        void loadGameFavicon(gameId);
    }, [gameId, loadGameFavicon]);

    return {
        currentFaviconUrl,
        setFavicon,
        resetFavicon,
        reloadFavicon,
    };
}
