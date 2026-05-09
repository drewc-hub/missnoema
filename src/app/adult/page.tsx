mport { redirect } from "next/navigation";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export default async function AdultPage() {
    const user = await getAuthedUser();

    if (!user) {
        redirect("/login?next=/adult");
    }

    if (!isAdultAllowed(user)) {
        redirect("/adult/verify?next=/adult");
    }

    return (
        <main>
            <h1>Adult Section</h1>
            <p>You are verified. Adult-only features can live here.</p>
            <p style={{ color: "#777" }}>
                Tip: keep all adult generation + browsing here web-only.
            </p>
        </main>
    );
}
