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
            <div className="min-w-0 flex-1 px-3 py-4 pb-24 sm:px-6 sm:py-6 sm:pb-6">
                {children}
            </div>
            <Footer className="mx-3 mb-24 rounded-[16px] sm:mx-6 sm:mb-6 sm:rounded-[24px]" />
        </NoemaAppShell>
    );
}
