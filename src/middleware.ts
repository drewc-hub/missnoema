import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getOrigin } from "@/lib/app-url";

export async function middleware(request: NextRequest) {
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(incoming: { name: string; value: string; options: CookieOptions }[]) {
          incoming.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.push(...incoming);
        },
      },
    },
  );

  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = request.nextUrl.searchParams.get("next") ?? "/companions";
      const safeNext = next.startsWith("/") ? next : "/companions";
      const res = NextResponse.redirect(new URL(safeNext, getOrigin(request)));
      cookiesToSet.forEach(({ name, value, options }) => {
        res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
      });
      return res;
    }
  }

  // Refresh auth session on every other request
  await supabase.auth.getUser();

  const response = NextResponse.next({ request });
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
