import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export interface ShortcutHandler {
    key: string;
    handler: () => void;
    description: string;
}

type BooleanSignal = {
    value: boolean;
};

export const isCommandPaletteOpen: BooleanSignal = {
    value: false,
};

export const isKeyboardHelpOpen: BooleanSignal = {
    value: false,
};

let keySequence = "";
let keySequenceTimeout: ReturnType<typeof setTimeout> | null = null;

export function useKeyboardShortcuts(gameId?: string) {
    const navigate = useNavigate();

    useEffect(() => {
        const shortcuts: ShortcutHandler[] = [
            {
                key: "/",
                handler: () => {
                    isCommandPaletteOpen.value = true;
                },
                description: "Open search",
            },
            {
                key: "Escape",
                handler: () => {
                    isCommandPaletteOpen.value = false;
                    isKeyboardHelpOpen.value = false;
                },
                description: "Close modals",
            },
            {
                key: "?",
                handler: () => {
                    isKeyboardHelpOpen.value = !isKeyboardHelpOpen.value;
                },
                description: "Toggle keyboard shortcuts help",
            },
        ];

        const gShortcuts: Record<string, { path: string; description: string }> = {
            h: { path: "/", description: "Go home" },
            o: {
                path: gameId ? `/games/${gameId}` : "/",
                description: "Go to overview",
            },
            c: {
                path: gameId ? `/games/${gameId}/characters` : "/",
                description: "Go to characters",
            },
            l: {
                path: gameId ? `/games/${gameId}/locations` : "/",
                description: "Go to locations",
            },
            q: {
                path: gameId ? `/games/${gameId}/quests` : "/",
                description: "Go to quests",
            },
            m: {
                path: gameId ? `/games/${gameId}/map` : "/",
                description: "Go to map",
            },
            i: {
                path: gameId ? `/games/${gameId}/images` : "/",
                description: "Go to images",
            },
        };

        function closeModals() {
            isCommandPaletteOpen.value = false;
            isKeyboardHelpOpen.value = false;
        }

        function handleKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;

            const isTyping =
                target instanceof HTMLInputElement ||
                target instanceof HTMLTextAreaElement ||
                Boolean(target?.isContentEditable);

            if (isTyping) {
                if (event.key === "Escape") {
                    closeModals();
                }

                return;
            }

            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                event.preventDefault();
                isCommandPaletteOpen.value = true;
                return;
            }

            for (const shortcut of shortcuts) {
                if (event.key === shortcut.key && !event.metaKey && !event.ctrlKey) {
                    if (event.key !== "?") {
                        event.preventDefault();
                    }

                    shortcut.handler();
                    return;
                }
            }

            const key = event.key.toLowerCase();

            if (keySequenceTimeout) {
                clearTimeout(keySequenceTimeout);
                keySequenceTimeout = null;
            }

            if (key === "g" && keySequence === "") {
                keySequence = "g";

                keySequenceTimeout = setTimeout(() => {
                    keySequence = "";
                }, 500);

                return;
            }

            if (keySequence === "g" && gShortcuts[key]) {
                event.preventDefault();
                navigate(gShortcuts[key].path);
                keySequence = "";
                return;
            }

            keySequence = "";
        }

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);

            if (keySequenceTimeout) {
                clearTimeout(keySequenceTimeout);
                keySequenceTimeout = null;
            }
        };
    }, [gameId, navigate]);

    const gShortcuts: Record<string, { path: string; description: string }> = {
        h: { path: "/", description: "Go home" },
        o: {
            path: gameId ? `/games/${gameId}` : "/",
            description: "Go to overview",
        },
        c: {
            path: gameId ? `/games/${gameId}/characters` : "/",
            description: "Go to characters",
        },
        l: {
            path: gameId ? `/games/${gameId}/locations` : "/",
            description: "Go to locations",
        },
        q: {
            path: gameId ? `/games/${gameId}/quests` : "/",
            description: "Go to quests",
        },
        m: {
            path: gameId ? `/games/${gameId}/map` : "/",
            description: "Go to map",
        },
        i: {
            path: gameId ? `/games/${gameId}/images` : "/",
            description: "Go to images",
        },
    };

    return {
        isCommandPaletteOpen,
        isKeyboardHelpOpen,
        shortcuts: [
            {
                key: "/",
                handler: () => {
                    isCommandPaletteOpen.value = true;
                },
                description: "Open search",
            },
            {
                key: "Escape",
                handler: () => {
                    isCommandPaletteOpen.value = false;
                    isKeyboardHelpOpen.value = false;
                },
                description: "Close modals",
            },
            {
                key: "?",
                handler: () => {
                    isKeyboardHelpOpen.value = !isKeyboardHelpOpen.value;
                },
                description: "Toggle keyboard shortcuts help",
            },
            ...Object.entries(gShortcuts).map(([key, { description }]) => ({
                key: `g ${key}`,
                handler: () => { },
                description,
            })),
        ],
    };
}
