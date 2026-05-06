'use client';
import React from 'react';
import { useDescope } from '@descope/nextjs-sdk/client';

export default function LoginClient() {
    const sdk = useDescope();

    const handleLogin = () => {
        const next = new URLSearchParams(window.location.search).get('next') || '/companions';
        sessionStorage.setItem('loginNext', next);
        sdk.oidc.loginWithRedirect({
                redirect_uri: 'https://missnoema.com/auth/descope-callback',
        });
    };

    return (
        <button onClick={handleLogin}>
            Login with OIDC
        </button>
    );
}
