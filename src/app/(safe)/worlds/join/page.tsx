import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isRpWorldEligible } from "@/lib/rp-world";
import { WorldJoinByCodeForm } from "@/components/WorldJoinByCodeForm";
import { WorldJoinByCodeHandler } from "@/components/WorldJoinByCodeHandler";

type SearchParams = {
  code?: string;
};

export default async function WorldsJoinPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await getAuthedUser();
  const sp = await searchParams;
  const code = (sp.code ?? "").trim().toUpperCase();

  if (!user) {
    const next = code ? `/worlds/join?code=${encodeURIComponent(code)}` : "/worlds/join";
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  if (!isRpWorldEligible(user.plan)) {
    redirect("/account/billing");
  }

  return (
    <main className="space-y-5 text-zinc-100">
      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <h1 className="text-3xl font-black tracking-tight text-white">Join RP world</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Use an invite link or enter a code manually.
        </p>
      </section>

      {code ? <WorldJoinByCodeHandler code={code} /> : <WorldJoinByCodeForm />}
    </main>
  );
}
