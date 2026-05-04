// file: src/lib/supabase/server.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { CookieOptions } from "@supabase/ssr";

function envAny(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim()) return v.trim();
  }
  throw new Error(`Missing env var: one of [${names.join(", ")}]`);
}

function supabaseUrl() {
  return envAny("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
}

function supabaseAnonKey() {
  return envAny("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

/**
 * ✅ Server Components / loaders:
 * Read-only cookies (cannot set cookies here)
 */
export async function createSupabaseServerClientReadOnly() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll() {
        // no-op: cookie writes forbidden in Server Components
      },
    },
  });
}

/**
 * ✅ Route Handlers:
 * Collect cookies to set, and the caller attaches them to the response they return.
 */
export function createSupabaseServerClientRoute(req: NextRequest) {
  const cookiesToSet: Array<{
    name: string;
    value: string;
    options: CookieOptions;
  }> = [];

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(newCookies) {
        for (const c of newCookies) cookiesToSet.push(c);
      },
    },
  });

  return { supabase, cookiesToSet };
}

/**
 * Helper: apply queued cookies to any Response-like object.
 */
export function applySupabaseCookies<T extends Response>(
  res: T,
  cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>,
) {
  const headers = new Headers(res.headers);

  for (const c of cookiesToSet) {
    // Build Set-Cookie header manually
    const parts: string[] = [`${c.name}=${c.value}`];

    const o = c.options ?? {};
    if (o.maxAge != null) parts.push(`Max-Age=${o.maxAge}`);
    if (o.expires) parts.push(`Expires=${o.expires.toUTCString()}`);
    if (o.path) parts.push(`Path=${o.path}`);
    if (o.domain) parts.push(`Domain=${o.domain}`);
    if (o.httpOnly) parts.push("HttpOnly");
    if (o.secure) parts.push("Secure");
    if (o.sameSite) parts.push(`SameSite=${String(o.sameSite)}`);

    headers.append("Set-Cookie", parts.join("; "));
  }

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  }) as T;
}
