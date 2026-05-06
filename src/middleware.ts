import { NextResponse, type NextRequest } from 'next/server';
import { authMiddleware, createSdk } from '@descope/nextjs-sdk/server';

const PUBLIC_API_PATHS = new Set([
    '/api/auth/adult-status',
    '/api/auth/provision',
    '/api/stripe/webhook',
]);

const descopePageAuth = authMiddleware({
    projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID!,
    redirectUrl: '/login',
    publicRoutes: [
        '/',
        '/login',
        '/adult/verify',
        '/auth/*',
        '/privacy',
        '/terms',
    ],
});

const sdk = createSdk({ projectId: process.env.NEXT_PUBLIC_DESCOPE_PROJECT_ID! });

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    if (pathname.startsWith('/_next') || pathname === '/favicon.ico') {
        return NextResponse.next();
    }

    // API routes: validate JWT and return 401 instead of redirect
    if (pathname.startsWith('/api/')) {
        if (PUBLIC_API_PATHS.has(pathname)) return NextResponse.next();

        const sessionToken = req.cookies.get('DS')?.value;
        if (!sessionToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        try {
            await sdk.validateJwt(sessionToken);
            return NextResponse.next();
        } catch {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    // Adult gating: check age verification for /adult/* routes
    const isAdultArea =
        pathname === '/adult' || pathname.startsWith('/adult/');
    if (isAdultArea && pathname !== '/adult/verify') {
        const sessionToken = req.cookies.get('DS')?.value;
        if (sessionToken) {
            const checkUrl = new URL('/api/auth/adult-status', req.url);
            const statusRes = await fetch(checkUrl, {
                headers: { cookie: req.headers.get('cookie') ?? '' },
            }).catch(() => null);

            if (statusRes?.ok) {
                const json = (await statusRes.json().catch(() => null)) as any;
                if (json?.verified18 === false) {
                    const url = req.nextUrl.clone();
                    url.pathname = '/adult/verify';
                    url.searchParams.set('next', pathname);
                    return NextResponse.redirect(url);
                }
            }
        }
    }

    // Page routes: delegate to Descope authMiddleware
    return descopePageAuth(req);
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
