import "./globals.css";
import type { Metadata } from "next";
import { DailyRewardClaim } from "@/components/DailyRewardClaim";

export const metadata: Metadata = {
  title: "Noema",
  description: "AI companions with real memory — longer context, saved facts, pinned moments.",
  icons: { icon: "/logo-icon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <DailyRewardClaim />
      </body>
    </html>
  );
}
