import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, type NextResponse } from "next/server";

type SetCookieItem = { name: string; value: string; options: CookieOptions };

// For Server Components and read-only Route Handlers
export async function createSupabaseServerClientReadOnly() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    },
  );
}

// For Route Handlers that need to set session cookies on a response
export function createSupabaseServerClientRoute(req: NextRequest) {
  const cookiesToSet: SetCookieItem[] = [];
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(incoming: SetCookieItem[]) {
          incoming.forEach(({ name, value, options }) => {
            cookiesToSet.push({ name, value, options });
          });
        },
      },
    },
  );
  return { supabase, cookiesToSet };
}

// Apply cookies collected by createSupabaseServerClientRoute to a response
export function applySupabaseCookies(res: NextResponse, cookiesToSet: SetCookieItem[]) {
  cookiesToSet.forEach(({ name, value, options }) => {
    res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
  });
  return res;
}
