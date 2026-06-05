import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function LegacyAdultCompanionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const incoming = await searchParams;
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(incoming)) {
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item));
    } else if (value) {
      query.set(key, value);
    }
  }

  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(`/companions${suffix}`);
}
