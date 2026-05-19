import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const lorebooks = await prisma.lorebook.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      entries: {
        where: { enabled: true },
        orderBy: { priority: "desc" },
      },
    },
  });

  return NextResponse.json({ lorebooks });
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : undefined;
  const isGlobal = body?.isGlobal === true;

  if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });

  const lorebook = await prisma.lorebook.create({
    data: { userId: user.id, name, description, isGlobal },
    include: { entries: true },
  });

  return NextResponse.json({ lorebook }, { status: 201 });
}
