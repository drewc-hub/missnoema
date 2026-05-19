import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id } = await params;
  const lorebook = await prisma.lorebook.findFirst({
    where: { id, userId: user.id },
    include: { entries: { orderBy: { priority: "desc" } } },
  });

  if (!lorebook) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return NextResponse.json({ lorebook });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.lorebook.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.description === "string") data.description = body.description.trim();
  if (typeof body.isGlobal === "boolean") data.isGlobal = body.isGlobal;
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;

  const lorebook = await prisma.lorebook.update({ where: { id }, data });
  return NextResponse.json({ lorebook });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.lorebook.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.lorebook.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
