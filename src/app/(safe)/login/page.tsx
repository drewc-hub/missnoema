'use client';

import dynamic from 'next/dynamic';

const LoginClient = dynamic(() => import('./_login-client'), { ssr: false });

export default function Page() {
    return <LoginClient />;
}
