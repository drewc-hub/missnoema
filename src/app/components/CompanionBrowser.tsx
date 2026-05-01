"use client";

import { useState } from "react";
import CompanionGrid from "/src/components/CompanionGrid";
import FilterBar from "./FilterBar";

export default function CompanionBrowser({ characters }) {
    const [query, setQuery] = useState("");
    const [showAdult, setShowAdult] = useState(false);

    const filtered = characters.filter((c) => {
        const matchesSearch =
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.tags.some((tag) =>
                tag.toLowerCase().includes(query.toLowerCase())
            );

        const matchesAdult =
            showAdult ? c.isAdultOnly : true;

        return matchesSearch && matchesAdult;
    });

    return (
        <>
            <input
                placeholder="Search companions..."
                className="mb-4 p-2 w-full bg-neutral-900 rounded-lg"
                onChange={(e) => setQuery(e.target.value)}
            />

            <FilterBar
                showAdult={showAdult}
                setShowAdult={setShowAdult}
            />

            <CompanionGrid characters={filtered} bg-blue-700 bg-opacity-25 border-zinc-400 border-[3px]/>
        </>
    );
}

