import { redirect } from "next/navigation";

export default async function LegacyAdultCompanionProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/companions/${encodeURIComponent(slug)}`);
}
