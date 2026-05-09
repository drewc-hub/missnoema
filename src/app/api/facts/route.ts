import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const companionId = req.nextUrl.searchParams.get("companionId") ?? undefined;

  const facts = await prisma.userFact.findMany({
    where: {
      userId: user.id,
      ...(companionId ? { OR: [{ companionId }, { companionId: null }] } : {}),
    },
    orderBy: { createdAt: "asc" },
    select: { id: true, companionId: true, fact: true, createdAt: true },
  });

  return NextResponse.json({ facts });
}

export async function POST(req: NextRequest) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const fact = typeof body?.fact === "string" ? body.fact.trim() : "";
  const companionId = typeof body?.companionId === "string" ? body.companionId : null;

  if (!fact) return NextResponse.json({ error: "fact is required." }, { status: 400 });
  if (fact.length > 500) return NextResponse.json({ error: "fact too long (max 500 chars)." }, { status: 400 });

  const existing = await prisma.userFact.count({ where: { userId: user.id } });
  if (existing >= 100) {
    return NextResponse.json({ error: "Fact limit reached (100 max). Delete some to add more." }, { status: 400 });
  }

  const created = await prisma.userFact.create({
    data: { userId: user.id, companionId, fact },
    select: { id: true, companionId: true, fact: true, createdAt: true },
  });

  return NextResponse.json({ ok: true, fact: created });
}
