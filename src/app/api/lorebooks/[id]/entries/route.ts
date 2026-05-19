import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id: lorebookId } = await params;
  const lorebook = await prisma.lorebook.findFirst({ where: { id: lorebookId, userId: user.id } });
  if (!lorebook) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  const keys = Array.isArray(body?.keys)
    ? body.keys.filter((k: unknown): k is string => typeof k === "string" && k.trim().length > 0).map((k: string) => k.trim())
    : [];
  const constant = body?.constant === true;
  const priority = typeof body?.priority === "number" ? body.priority : 100;

  if (!content) return NextResponse.json({ error: "Content required." }, { status: 400 });

  const entry = await prisma.loreEntry.create({
    data: { lorebookId, keys, content, constant, priority },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
