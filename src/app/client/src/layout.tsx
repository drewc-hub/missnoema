"use client";
import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { startKeepAlive } from "@/lib/keep-alive";
import { installCsrfFetchShim } from "@/lib/csrf-fetch";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

export default function ClientLayout({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        startKeepAlive();
        installCsrfFetchShim();
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
