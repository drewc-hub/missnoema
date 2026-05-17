import React, { useEffect, useRef, useState } from "react";
import AvatarPlaceholder from "@/components/AvatarPlaceholder";

import { useApi } from "@/composables/useApi";
import { isCommandPaletteOpen } from "@/composables/useKeyboardShortcuts";
import type { SearchResultItem } from "@/types";

type Props = {
    gameId?: string;
    navigate: (path: string) => void;
};

export default function CommandPalette({ gameId, navigate }: Props) {
    const { search } = useApi();

    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isOpen, setIsOpen] = useState(Boolean(isCommandPaletteOpen.value));

    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setIsOpen(Boolean(isCommandPaletteOpen.value));
        }, 50);

        return () => window.clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        setQuery("");
        setSearchResults([]);
        setSelectedIndex(0);

        requestAnimationFrame(() => {
            inputRef.current?.focus();
        });
    }, [isOpen]);

    useEffect(() => {
        const timeout = window.setTimeout(async () => {
            if (!query || query.length < 2 || !gameId) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);

            const results = await search(gameId, query);

            setSearchResults([
                ...results.characters,
                ...results.locations,
                ...results.quests,
                ...results.items,
                ...results.factions,
                ...results.notes,
                ...results.events,
            ]);

            setIsSearching(false);
            setSelectedIndex(0);
        }, 150);

        return () => window.clearTimeout(timeout);
    }, [query, gameId, search]);

    function close() {
        isCommandPaletteOpen.value = false;
        setIsOpen(false);
    }

    function navigateTo(item: SearchResultItem) {
        const paths: Record<string, string> = {
            character: `/characters/${item.id}`,
            location: `/locations/${item.id}`,
            quest: `/quests/${item.id}`,
            item: `/items/${item.id}`,
            faction: `/factions/${item.id}`,
            note: gameId ? `/games/${gameId}/notes` : "/",
            event: gameId ? `/games/${gameId}/history` : "/",
        };

        const path = paths[item.type];

        if (path) navigate(path);

        close();
    }

    function hasPrimaryImage(
        item: SearchResultItem
    ): item is SearchResultItem & { primaryImageId: string } {
        return "primaryImageId" in item && Boolean(item.primaryImageId);
    }

    function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setSelectedIndex((index) =>
                Math.min(index + 1, searchResults.length - 1)
            );
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();
            setSelectedIndex((index) => Math.max(index - 1, 0));
        }

        if (event.key === "Enter" && searchResults.length > 0) {
            event.preventDefault();

            const item = searchResults[selectedIndex];
            if (item) navigateTo(item);
        }
    }

    function getTypeIcon(type: string): string {
        const icons: Record<string, string> = {
            character:
                "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
            location:
                "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z",
            quest:
                "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
            item:
                "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
            faction:
                "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
            note:
                "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
            event:
                "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
        };

        return icons[type] || "";
    }

    if (!isOpen) return null;

    return (
        <div className="command-palette-overlay" onClick={close}>
            <div
                className="command-palette"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={handleKeyDown}
            >
                <div className="search-input-container">
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        className="search-icon"
                    >
                        <path
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>

                    <input
                        ref={inputRef}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        type="text"
                        placeholder="Search characters, locations, quests..."
                        className="search-input"
                    />

                    <kbd className="escape-hint">esc</kbd>
                </div>

                {!gameId ? (
                    <div className="no-game">
                        <p className="empty-message">Navigate to a game to search</p>
                    </div>
                ) : isSearching ? (
                    <div className="searching">
                        <span className="spinner" />
                        Searching...
                    </div>
                ) : searchResults.length === 0 && query.length >= 2 ? (
                    <div className="no-results">No results found for "{query}"</div>
                ) : searchResults.length > 0 ? (
                    <ul className="results-list">
                        {searchResults.map((item, index) => (
                            <li
                                key={`${item.type}-${item.id}`}
                                className={`result-item ${index === selectedIndex ? "selected" : ""
                                    }`}
                                onClick={() => navigateTo(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className="result-icon">
                                    {hasPrimaryImage(item) ? (
                                        <img
                                            src={`/images/${item.primaryImageId}/file?width=80&height=80`}
                                            alt={item.name}
                                            className="result-thumb"
                                        />
                                    ) : item.type === "character" ? (
                                        <AvatarPlaceholder name={item.name} size="sm" />
                                    ) : (
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth={1.5}
                                        >
                                            <path
                                                d={getTypeIcon(item.type)}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            />
                                        </svg>
                                    )}
                                </div>

                                <div className="result-content">
                                    <span className="result-name">{item.name}</span>

                                    <span className="result-type">
                                        {item.type}

                                        {item.type === "character" && item.isPlayer && (
                                            <span className="pc-badge">PC</span>
                                        )}

                                        {"status" in item && item.status && (
                                            <span className={`status-badge ${item.status}`}>
                                                {item.status}
                                            </span>
                                        )}

                                        {item.type === "note" && item.category && (
                                            <span className="category-badge">{item.category}</span>
                                        )}

                                        {item.type === "event" && (
                                            <span className="event-type-badge">
                                                {item.eventType}
                                            </span>
                                        )}
                                    </span>

                                    {item.snippet && (
                                        <span className="result-snippet">{item.snippet}</span>
                                    )}
                                </div>

                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    className="arrow-icon"
                                >
                                    <path
                                        d="M9 5l7 7-7 7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="hint">
                        <span>Type to search</span>
                        <span className="hint-shortcut">
                            <kbd>/</kbd> or <kbd>Cmd+K</kbd> to open
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}
