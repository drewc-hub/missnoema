import "./globals.css";
import React from "react";
import { AuthProvider } from '@descope/nextjs-sdk';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-slate-950 text-zinc-100 antialiased">
                <AuthProvider
                    projectId={process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!}
                    oidcConfig={true}
                >
                    {children}
                </AuthProvider>
            </body>
        </html>
    );
}
