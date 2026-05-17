"use client"
import React from "react";
import { Outlet, useParams } from "react-router-dom";

import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import CommandPalette from "@/components/CommandPalette";
import ToastContainer from "@/components/ToastContainer";

import { useTheme } from "@/composables/useTheme";
import { useFavicon } from "@/composables/useFavicon";
import {
    useKeyboardShortcuts,
    isCommandPaletteOpen,
} from "@/composables/useKeyboardShortcuts";

export default function tavernGamesPage() {
    useTheme();
    useFavicon();

    const { gameId } = useParams<{ gameId?: string }>();

    useKeyboardShortcuts(gameId);

    function openSearch() {
        isCommandPaletteOpen.value = true;
    }

    return (
        <div id="app">
            {!gameId && <AppHeader />}

            {gameId && (
                <button
                    className="global-search-button"
                    onClick={openSearch}
                    title="Search (Cmd+K)"
                >
                    <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.5}
                        className="search-icon"
                    >
                        <path
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>

                    <span className="search-text">Search</span>
                    <kbd className="search-shortcut">/</kbd>
                </button>
            )}

            <main className="container">
                <Outlet />
            </main>

            <AppFooter />

            <CommandPalette gameId={gameId} />
            <ToastContainer />
        </div>
    );
}
