// file: src/app/(safe)/login/page.tsx
'use client';
import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { LoginForm } from "@/components/LoginForm";


import { useDescope } from '@descope/nextjs-sdk/client';

export default function Page() {
    const sdk = useDescope();

    return (
        <button
            onClick={() => {
                sdk.oidc.loginWithRedirect({
                    redirect_uri: window.location.origin, // Optional: defaults to current URL
                    login_hint: 'user@example.com', // Optional: pre-fill the form.externalId context key
                });
            }}
        >
            Login with OIDC
        </button>
    );
}
