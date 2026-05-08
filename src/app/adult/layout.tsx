import React from "react";
import { Footer } from "@/components/Footer";
import { AdultTopNav } from "@/components/Adultnav";

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
                <Footer className="rounded-[24px]" />
            </div>
        </>
    );
}
