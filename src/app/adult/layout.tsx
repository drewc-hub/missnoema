import React from "react";
import { AdultFooter } from "@/components/AdultFooter";
import { AdultTopNav } from "@/components/Adultnav";
import type { Viewport } from 'next'

export const viewport: Viewport = {
    themeColor: 'black',
    width: 'device-width',
    initialScale: 1,
    // Useful for mobile devices with notches
    viewportFit: 'cover',
}

export default function AdultLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <AdultTopNav />
            <div className="mx-auto min-w-0 w-full max-w-6xl px-3 sm:px-4">
                <div className="min-w-0 py-4 sm:py-8">{children}</div>
                <AdultFooter className="rounded-[16px] sm:rounded-[24px]" />
            </div>
        </>
    );
}
