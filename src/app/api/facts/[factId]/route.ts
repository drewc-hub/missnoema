import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ factId: string }> },
) {
  const { factId } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const fact = await prisma.userFact.findFirst({
    where: { id: factId, userId: user.id },
    select: { id: true },
  });

  if (!fact) return NextResponse.json({ error: "Fact not found." }, { status: 404 });

  await prisma.userFact.delete({ where: { id: factId } });

  return NextResponse.json({ ok: true, id: factId });
}
