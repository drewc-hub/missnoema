import "./globals.css";
import React from "react";
import { AuthProvider } from '@descope/nextjs-sdk';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider
            projectId="gdmewvhmpxounbzjckeo" // Replace with your Project ID
            oidcConfig={true}         // Enables OIDC redirect behavior
        >
            <html lang="en">
                <body className="bg-slate-950 text-zinc-100 antialiased">{children}</body>
            </html>
        </AuthProvider>
    );
}
