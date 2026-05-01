// file: src/app/(safe)/login/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import { LoginForm } from "@/components/LoginForm";

export const runtime = "nodejs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/companions";

  const supabase = await createSupabaseServerClientReadOnly();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect(next);
  }

  return <LoginForm next={next} />;
}
