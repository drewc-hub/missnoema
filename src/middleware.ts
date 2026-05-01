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

function envAny(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  throw new Error(`Missing env var: one of [${names.join(", ")}]`);
}

function createSupabaseMiddlewareClient(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    envAny("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"),
    envAny("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
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

  // Never block static/assets/api
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname === "/favicon.ico") return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.next();

  // Public paths
  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  const { supabase, res } = createSupabaseMiddlewareClient(req);

  const { data } = await supabase.auth.getUser();
  const user = data.user;

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
