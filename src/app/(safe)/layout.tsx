import React from "react";
import { Footer } from "@/components/Footer";
import { NoemaAppShell } from "@/components/NoemaAppShell";
import { NoemaTopNav } from "@/components/NoemaTopNav";

export default function SafeLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <NoemaAppShell>
            <NoemaTopNav />
            <div className="flex-1 px-4 sm:px-6 py-6">
                {children}
            </div>
            <Footer className="mx-4 sm:mx-6 mb-6 rounded-[24px]" />
        </NoemaAppShell>
    );
}
