import { NextResponse } from "next/server";
import { ContentRating, DiscoveryAction, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

const ACTIONS = ["impression", "pass", "save", "start"] as const;
type DiscoveryActionInput = (typeof ACTIONS)[number];

function toDiscoveryAction(action: DiscoveryActionInput) {
  const map: Record<DiscoveryActionInput, DiscoveryAction> = {
    impression: DiscoveryAction.IMPRESSION,
    pass: DiscoveryAction.PASS,
    save: DiscoveryAction.SAVE,
    start: DiscoveryAction.START,
  };
  return map[action];
}

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const companionId =
    typeof body?.companionId === "string" ? body.companionId : "";
  const action =
    typeof body?.action === "string" ? (body.action as DiscoveryActionInput) : null;
  const source =
    typeof body?.source === "string" && body.source.length <= 40
      ? body.source
      : "discover";

  if (!companionId || !action || !ACTIONS.includes(action)) {
    return NextResponse.json({ error: "Invalid discovery reaction." }, { status: 400 });
  }

  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      visibility: Visibility.PUBLIC,
      contentRating: {
        in: isAdultAllowed(user)
          ? [ContentRating.SAFE, ContentRating.ADULT]
          : [ContentRating.SAFE],
      },
    },
    select: { id: true, contentRating: true },
  });

  if (!companion) {
    return NextResponse.json({ error: "Companion not found." }, { status: 404 });
  }

  const existing = await prisma.companionReaction.findUnique({
    where: {
      userId_companionId: {
        userId: user.id,
        companionId,
      },
    },
    select: { saved: true, viewedAt: true },
  });

  const now = new Date();
  const saved = action === "save" ? true : existing?.saved ?? false;
  const viewedAt = existing?.viewedAt ?? now;

  await prisma.$transaction([
    prisma.discoveryEvent.create({
      data: {
        userId: user.id,
        companionId,
        action: toDiscoveryAction(action),
        source,
      },
    }),
    prisma.companionReaction.upsert({
      where: {
        userId_companionId: {
          userId: user.id,
          companionId,
        },
      },
      create: {
        userId: user.id,
        companionId,
        saved,
        liked: action === "start",
        viewedAt,
      },
      update: {
        saved,
        liked: action === "start" ? true : undefined,
        viewedAt,
      },
    }),
    ...(existing?.viewedAt
      ? []
      : [
          prisma.companion.update({
            where: { id: companionId },
            data: { views: { increment: 1 } },
          }),
        ]),
    ...(action === "save" && !existing?.saved
      ? [
          prisma.companion.update({
            where: { id: companionId },
            data: { saves: { increment: 1 } },
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true, action, saved });
}
