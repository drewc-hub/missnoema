import "./globals.css";
import type { Metadata } from "next";
import React from "react";
import { Footer } from "@/components/Footer";
import { AdultTopNav } from "@/components/Adultnav";
export const metadata: Metadata = {
  title: "NOMEA",
  description: "Companion library + custom companions",
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-zinc-100 antialiased">
        <AdultTopNav />
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="py-8 rounded-lg-:em"> {children}</div>
          <Footer className="rounded-[24px]" />
        </div>
      </body>
    </html>
  );
}
