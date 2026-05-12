import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthedUser } from "@/lib/auth";
import { getMatchmakingDeck } from "@/lib/matchmaking";

export const runtime = "nodejs";

const QuerySchema = z.object({
  includeAdult: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(50).optional().default(16),
});

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    includeAdult: url.searchParams.get("includeAdult") === "1",
    limit: Number(url.searchParams.get("limit") ?? "16"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query.", details: parsed.error.flatten() }, { status: 400 });
  }

  const excludeIds = (url.searchParams.get("exclude") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, 250);

  const deck = await getMatchmakingDeck({
    user,
    includeAdult: parsed.data.includeAdult,
    limit: parsed.data.limit,
    excludeIds,
  });

  return NextResponse.json({
    ok: true,
    includeAdult: deck.includeAdult,
    exhausted: deck.exhausted,
    items: deck.items,
  });
}
