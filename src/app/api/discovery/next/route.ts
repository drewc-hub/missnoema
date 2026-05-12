import { NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/auth";
import { getDiscoveryDeck } from "@/lib/discovery";
import { getMatchmakingDeck } from "@/lib/matchmaking";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getAuthedUser();
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const mode = (url.searchParams.get("mode") ?? "discovery").toLowerCase();
  const includeAdult = url.searchParams.get("includeAdult") === "1";
  const excludeIds = (url.searchParams.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 200);

  const deck =
    mode === "matchmaking"
      ? await getMatchmakingDeck({
          user,
          limit,
          excludeIds,
          includeAdult,
        })
      : await getDiscoveryDeck({
          user,
          limit,
          excludeIds,
        });

  return NextResponse.json(deck);
}
