import { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export default async function AdultVerifyPage({
    searchParams,
}: {
    searchParams: Promise<{ next?: string }>;
}) {
    const sp = await searchParams;
    const next = sp.next?.startsWith("/") ? sp.next : "/adult/companions";

    const user = await getAuthedUser();

    if (!user) {
        redirect(`/login?next=${encodeURIComponent("/adult/verify")}`);
    }

    if (isAdultAllowed(user)) {
        redirect(next);
    }

    return (
        <main className="mx-auto max-w-2xl p-8">
            <h1 className="text-2xl font-bold">Age verification</h1>

            <p className="mt-3 text-sm text-zinc-500">
                Confirm you are 18+ to access web-only adult content.
            </p>

            <form
                action={`/api/age/verify?next=${encodeURIComponent(next)}`}
                method="post"
                className="mt-6 space-y-4"
            >
                <label className="flex gap-3">
                    <input required name="confirm" value="1" type="checkbox" />
                    <span>I confirm I am 18 years of age or older.</span>
                </label>

                <button className="rounded bg-black px-4 py-2 text-white">
                    Verify & Continue
                </button>
            </form>
        </main>
    );
}
