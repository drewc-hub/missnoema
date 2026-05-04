// file: src/middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/auth/callback",
  "/auth/magic-link",
  "/auth/signout",
  "/adult/verify",
]);

// API routes that do not require an authenticated session
const PUBLIC_API_PATHS = new Set([
  "/api/auth/callback",
  "/api/auth/logout",
  "/api/auth/adult-status",
  "/api/stripe/webhook",
]);

function createSupabaseMiddlewareClient(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            req.cookies.set(name, value);
            res.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  return { supabase, res };
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Never block Next.js internals or static assets
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();

  // Allow public API routes through without session validation
  if (PUBLIC_API_PATHS.has(pathname)) return NextResponse.next();

  // Public page paths — no auth needed
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const { supabase, res } = createSupabaseMiddlewareClient(req);

  // Refresh the session and propagate updated auth cookies to the response
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // Protected API routes: return 401 JSON instead of redirecting
  if (pathname.startsWith("/api/")) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return res;
  }

  const protectedPrefixes = [
    "/me",
    "/companions",
    "/chat",
    "/create",
    "/admin",
    "/adult",
  ];
  const isProtected = protectedPrefixes.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  if (isProtected && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Adult gating: logged-in but not verified -> send to /adult/verify
  const isAdultArea = pathname === "/adult" || pathname.startsWith("/adult/");
  if (isAdultArea && user && pathname !== "/adult/verify") {
    const checkUrl = new URL("/api/auth/adult-status", req.url);

    const statusRes = await fetch(checkUrl, {
      headers: { cookie: req.headers.get("cookie") ?? "" },
    }).catch(() => null);

    if (statusRes?.ok) {
      const json = (await statusRes.json().catch(() => null)) as any;
      if (json && json.verified18 === false) {
        const url = req.nextUrl.clone();
        url.pathname = "/adult/verify";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
