import { getAuthedUser } from "@/lib/auth";
import { requireAdultAllowed } from "@/lib/ratings";

export default async function AdultPage() {
  const user = await getAuthedUser();
  requireAdultAllowed(user);

  return (
    <main>
      <h1>Adult Section</h1>
      <p>You are verified. Adult-only features can live here.</p>
      <p style={{ color: "#777" }}>
        Tip: keep all adult generation + browsing here (web-only).
      </p>
    </main>
  );
}
