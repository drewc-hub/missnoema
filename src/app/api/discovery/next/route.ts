import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getDiscoveryDeck } from "@/lib/discovery";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getAuthedUser();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const excludeIds = (url.searchParams.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);

  const deck = await getDiscoveryDeck({
    user,
    limit,
    excludeIds,
  });

  return NextResponse.json(deck);
}
