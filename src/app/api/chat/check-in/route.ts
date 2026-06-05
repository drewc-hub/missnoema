import { NextResponse } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
import { companionGenerate } from "@/lib/ai-client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const companionId =
    typeof body?.companionId === "string" ? body.companionId.trim() : "";

  if (!companionId) {
    return NextResponse.json({ error: "Missing companionId." }, { status: 400 });
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      OR: [{ ownerId: user.id }, { visibility: Visibility.PUBLIC }],
    },
    select: {
      id: true,
      name: true,
      description: true,
      profile: true,
      contentRating: true,
    },
  });

  if (!companion) {
    return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  }

  if (
    companion.contentRating === ContentRating.ADULT &&
    !isAdultAllowed(user)
  ) {
    return NextResponse.json(
      { error: "Age verification required." },
      { status: 403 },
    );
  }

  const conversation = await prisma.conversation.upsert({
    where: { userId_companionId: { userId: user.id, companionId } },
    update: { contentRating: companion.contentRating },
    create: {
      userId: user.id,
      companionId,
      contentRating: companion.contentRating,
    },
    select: {
      id: true,
      summary: true,
      memorySummary: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { role: true, content: true },
      },
    },
  });

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};
  const personality =
    typeof profile.personality === "string" ? profile.personality : "";
  const recent = [...conversation.messages]
    .reverse()
    .map((message) => `${message.role}: ${message.content.slice(0, 300)}`)
    .join("\n");

  const prompt = `
You are ${companion.name}, sending a spontaneous personal text message to someone you have an ongoing relationship with.
Stay fully in character. Sound natural, warm, and specific, never like an assistant or notification.
Write one concise text message of 1-3 sentences. Do not narrate actions. Do not use markdown or quotation marks.
Do not pressure the recipient to respond. Reference established conversation context when appropriate.
Keep the message ${companion.contentRating === ContentRating.ADULT ? "appropriate for a verified adult relationship while avoiding explicit sexual detail in an unsolicited check-in" : "safe and non-explicit"}.

Character: ${companion.description}
Personality: ${personality || "distinct and emotionally attentive"}
Relationship memory: ${conversation.summary || conversation.memorySummary || "still developing"}
Recent conversation:
${recent || "No recent messages."}
  `.trim();

  const reply = (
    await companionGenerate(prompt, [
      { role: "user", content: "Send your check-in text now." },
    ])
  ).trim();

  const message = await prisma.chatMessage.create({
    data: {
      conversationId: conversation.id,
      role: "assistant",
      content: reply || `Hey, I was just thinking about you.`,
      contentRating: companion.contentRating,
    },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
      isPinned: true,
    },
  });

  return NextResponse.json({ message });
}
