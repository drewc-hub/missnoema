// Delete all messages and reset relationship stats for a conversation
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const companionId = searchParams.get("companionId") ?? "";

  if (!companionId) {
    return NextResponse.json({ error: "Missing companionId." }, { status: 400 });
  }

  const conversation = await prisma.conversation.findFirst({
    where: { userId: user.id, companionId, deletedAt: null },
    select: { id: true },
  });

  if (!conversation) {
    return NextResponse.json({ error: "Conversation not found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.chatMessage.deleteMany({ where: { conversationId: conversation.id } }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        familiarity: 0,
        trust: 0,
        intimacy: 0,
        companionMood: 0,
        summary: null,
        memorySummary: null,
        emotionalMemory: null,
        emotionalProfile: null,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
