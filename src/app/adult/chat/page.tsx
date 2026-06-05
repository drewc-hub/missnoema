import { redirect } from "next/navigation";

type SearchParams = { companion?: string };

export default async function LegacyAdultChatPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { companion } = await searchParams;
  const query = companion?.trim()
    ? `?companion=${encodeURIComponent(companion.trim())}`
    : "";

  redirect(`/chat${query}`);
}
