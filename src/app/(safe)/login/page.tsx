// file: src/app/login/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClientReadOnly } from "@/lib/supabase/server";
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Badge,
} from "@/components/ui";

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

  return (
    <main className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader
          title="Login"
          subtitle="We’ll email you a magic link."
          right={<Badge>Web</Badge>}
        />
        <CardBody className="space-y-4">
          <form action="/auth/magic-link" method="post" className="space-y-3">
            <input type="hidden" name="next" value={next} />

            <div className="space-y-1">
              <div className="text-xs text-zinc-400">Email</div>
              <Input
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              Send magic link
            </Button>
          </form>

          <div className="text-xs text-zinc-500">
            By continuing you confirm you’re an adult where required and agree
            to the platform rules (no minors, no coercion, no exploitation).
          </div>
        </CardBody>
      </Card>

      <div className="text-center text-xs text-zinc-500">
        After you click the email link, you’ll be redirected to{" "}
        <span className="text-zinc-300">{next}</span>.
      </div>
    </main>
  );
}
