// file: src/app/api/chat/session/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import { ContentRating, Visibility } from "@prisma/client";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const url = new URL(req.url);
  const companionId = url.searchParams.get("companionId") ?? "";

  if (!companionId) {
    return NextResponse.json(
      { error: "Missing companionId." },
      { status: 400 },
    );
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      OR: [{ ownerId: user.id }, { visibility: Visibility.PUBLIC }],
    },
    select: {
      id: true,
      contentRating: true,
    },
  });

  if (!companion) {
    return NextResponse.json(
      { error: "Companion not found." },
      { status: 404 },
    );
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
    where: {
      userId_companionId: {
        userId: user.id,
        companionId: companion.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      companionId: companion.id,
    },
    select: {
      id: true,
      familiarity: true,
      trust: true,
      intimacy: true,
      kinkLevel: true,
      summary: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 50,
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    conversation,
  });
}
