// file: src/app/adult/verify/page.tsx
import React from "react";
import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { Card, CardBody, CardHeader, Button, Badge } from "@/components/ui";

export const runtime = "nodejs";

export default async function AdultVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/adult/companions";

  const user = await getAuthedUser();
  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/adult/verify?next=${encodeURIComponent(next)}`)}`,
    );
  }

  const verified = isAdultAllowed(user);

  if (verified) {
    return (
      <main className="mx-auto max-w-2xl space-y-4">
        <Card>
          <CardHeader
            title="Age verification"
            subtitle="You’re verified for web-only 18+ content."
            right={<Badge tone="safe">Verified ✅</Badge>}
          />
          <CardBody className="space-y-4 text-sm text-zinc-300">
            <p>
              Adult content is still opt-in and clearly labeled. SAFE is the
              default experience.
            </p>

            <div className="flex flex-wrap gap-2">
              <a href={next}>
                <Button>Continue</Button>
              </a>
              <a href="/companions">
                <Button variant="secondary">Back to SAFE library</Button>
              </a>
            </div>
          </CardBody>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl space-y-4">
      <Card>
        <CardHeader
          title="Age verification"
          subtitle="18+ content is web-only and gated. SAFE is the default experience."
          right={<Badge>Web-only</Badge>}
        />
        <CardBody className="space-y-4 text-sm text-zinc-300">
          <p>
            By continuing, you confirm you are 18+ and agree not to use NOMEA
            for anything involving minors or non-consensual content.
          </p>

          <form
            action={`/api/age/verify?next=${encodeURIComponent(next)}`}
            method="post"
            className="space-y-3"
          >
            <label className="flex items-start gap-3 text-sm">
              <input
                required
                name="confirm"
                value="1"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950"
              />
              <span>I confirm I am 18 years of age or older.</span>
            </label>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Verify & Continue</Button>
              <a href="/companions">
                <Button type="button" variant="secondary">
                  Back to SAFE library
                </Button>
              </a>
            </div>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
