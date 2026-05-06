'use client';
import React from 'react';
import { useDescope } from '@descope/nextjs-sdk/client';

export default function LoginClient() {
    const sdk = useDescope();

    return (
        <button
            onClick={() => {
                sdk.oidc.loginWithRedirect({
                    redirect_uri: window.location.origin,
                });
            }}
        >
            Login with OIDC
        </button>
    );
}
