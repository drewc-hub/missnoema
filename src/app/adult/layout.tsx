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
            <div className="mx-auto w-full max-w-6xl px-4">
                <div className="py-8">{children}</div>
                <AdultFooter className="rounded-[24px]" />
            </div>
        </>
    );
}
