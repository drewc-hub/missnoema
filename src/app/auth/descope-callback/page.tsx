'use client';
import { useEffect, useRef } from 'react';
import { useDescope, useSession, useUser } from '@descope/nextjs-sdk/client';
import { useRouter } from 'next/navigation';

export default function DescopeCallbackPage() {
    const sdk = useDescope();
    const { isAuthenticated } = useSession();
    const { user } = useUser();
    const router = useRouter();
    const exchanged = useRef(false);
    const provisioned = useRef(false);

    // Step 1: exchange the OIDC code for a Descope session
    useEffect(() => {
        if (exchanged.current) return;
        exchanged.current = true;
        sdk.oidc.finishLoginIfNeed();
    }, [sdk]);

    // Step 2: once the session is active, provision the user and navigate
    useEffect(() => {
        if (!isAuthenticated || !user || provisioned.current) return;
        provisioned.current = true;

        const next =
            typeof window !== 'undefined'
                ? sessionStorage.getItem('loginNext') || '/companions'
                : '/companions';
        sessionStorage.removeItem('loginNext');

        const email = (user as any).email || (user as any).loginIds?.[0] || '';

        fetch('/api/auth/provision', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        }).finally(() => {
            router.replace(next);
        });
    }, [isAuthenticated, user, router]);

    return (
        <div className="flex items-center justify-center min-h-screen">
            <p className="text-zinc-400">Completing sign in…</p>
        </div>
    );
}
