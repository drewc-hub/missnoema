import { NextResponse } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getAuthedUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const companion = await prisma.companion.findFirst({
    where: {
      slug,
      visibility: { in: [Visibility.PUBLIC, Visibility.UNLISTED, Visibility.PRIVATE] },
    },
    select: {
      id: true,
      ownerId: true,
      visibility: true,
      contentRating: true,
      name: true,
    },
  });
  if (!companion) return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  if (companion.visibility === Visibility.PRIVATE && companion.ownerId !== user.id) {
    return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  }
  if (companion.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return NextResponse.json({ error: "Age verification required." }, { status: 403 });
  }

  const conversation = await prisma.conversation.findUnique({
    where: {
      userId_companionId: {
        userId: user.id,
        companionId: companion.id,
      },
    },
    select: {
      id: true,
      familiarity: true,
      trust: true,
      intimacy: true,
      kinkLevel: true,
      relationshipLevel: true,
      companionMood: true,
      lastActiveAt: true,
      updatedAt: true,
    },
  });

  if (!conversation) {
    return NextResponse.json({
      companion: { slug, name: companion.name },
      relationship: {
        familiarity: 0,
        trust: 0,
        intimacy: 0,
        kinkLevel: 0,
        relationshipLevel: 1,
        companionMood: 0,
      },
      events: [],
    });
  }

  const events = await prisma.relationshipProgressEvent.findMany({
    where: {
      conversationId: conversation.id,
    },
    orderBy: { createdAt: "desc" },
    take: 30,
    select: {
      eventType: true,
      oldLevel: true,
      newLevel: true,
      familiarity: true,
      trust: true,
      intimacy: true,
      kinkLevel: true,
      metadata: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    companion: { slug, name: companion.name },
    relationship: conversation,
    events,
  });
}
