import React from "react";
import { Footer } from "@/components/Footer";
import { SafeTopNav } from "@/components/Safenav";

export default function AccountLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <SafeTopNav />
            <div className="mx-auto w-full max-w-6xl px-4">
                <div className="py-8">{children}</div>
                <Footer className="rounded-[24px]" />
            </div>
        </>
    );
}
