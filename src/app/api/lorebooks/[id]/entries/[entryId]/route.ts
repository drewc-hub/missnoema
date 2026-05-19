import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id: lorebookId, entryId } = await params;
  const lorebook = await prisma.lorebook.findFirst({ where: { id: lorebookId, userId: user.id } });
  if (!lorebook) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const entry = await prisma.loreEntry.findFirst({ where: { id: entryId, lorebookId } });
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.content === "string") data.content = body.content.trim();
  if (Array.isArray(body.keys)) {
    data.keys = body.keys
      .filter((k: unknown): k is string => typeof k === "string")
      .map((k: string) => k.trim())
      .filter(Boolean);
  }
  if (typeof body.constant === "boolean") data.constant = body.constant;
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.priority === "number") data.priority = body.priority;

  const updated = await prisma.loreEntry.update({ where: { id: entryId }, data });
  return NextResponse.json({ entry: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> },
) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id: lorebookId, entryId } = await params;
  const lorebook = await prisma.lorebook.findFirst({ where: { id: lorebookId, userId: user.id } });
  if (!lorebook) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.loreEntry.deleteMany({ where: { id: entryId, lorebookId } });
  return NextResponse.json({ ok: true });
}
