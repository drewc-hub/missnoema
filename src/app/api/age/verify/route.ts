// file: src/app/api/age/verify/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createSupabaseServerClientRoute,
  applySupabaseCookies,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/adult/companions";

  const form = await req.formData();
  const confirmed = form.get("confirm") === "1";

  if (!confirmed) {
    return NextResponse.json(
      { error: "You must confirm you are 18+." },
      { status: 400 },
    );
  }

  const { supabase, cookiesToSet } = createSupabaseServerClientRoute(req);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return applySupabaseCookies(res, cookiesToSet);
  }

  const su = data.user;

  await prisma.user.upsert({
    where: { supabaseUserId: su.id },
    update: {
      email: su.email ?? undefined,
      ageVerifiedAt: new Date(),
    },
    create: {
      supabaseUserId: su.id,
      email: su.email ?? undefined,
      ageVerifiedAt: new Date(),
    },
  });

  const res = NextResponse.redirect(new URL(next, url.origin), 303);
  return applySupabaseCookies(res, cookiesToSet);
}
