
import { NextResponse } from "next/server";
import { ContentRating, Visibility, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";
import {
  PremiumFeature,
  getUserEntitlementsMap,
  hasPremiumFeature,
} from "@/lib/premium";

export type ActiveUser = Awaited<ReturnType<typeof getAuthedUser>> extends infer T
  ? Exclude<T, null>
  : never;

export async function requireActiveUser() {
  const user = await getAuthedUser();

  if (!user) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Login required." }, { status: 401 }),
    };
  }

  if (user.suspendedAt) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Account suspended." }, { status: 403 }),
    };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function getAccessibleCompanionForUser(
  userId: string,
  companionId: string,
  viewer: ActiveUser
) {
  const companion = await prisma.companion.findFirst({
    where: {
      id: companionId,
      OR: [{ ownerId: userId }, { visibility: Visibility.PUBLIC }],
    },
    select: {
      id: true,
      ownerId: true,
      name: true,
      description: true,
      tags: true,
      profile: true,
      contentRating: true,
      visibility: true,
    },
  });

  if (!companion) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Companion not found." }, { status: 404 }),
    };
  }

  if (
    companion.contentRating === ContentRating.ADULT &&
    !isAdultAllowed(viewer)
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Age verification required." },
        { status: 403 }
      ),
    };
  }

  const entitlements = await getUserEntitlementsMap(viewer.id);

  if (
    companion.contentRating === ContentRating.ADULT &&
    !hasPremiumFeature(entitlements, PremiumFeature.NSFW_UNLOCKS)
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "NSFW unlock required." },
        { status: 403 }
      ),
    };
  }

  const premiumOnly =
    companion.profile &&
    typeof companion.profile === "object" &&
    (companion.profile as Record<string, unknown>).premiumOnly === true;

  if (
    premiumOnly &&
    !hasPremiumFeature(entitlements, PremiumFeature.PREMIUM_COMPANIONS)
  ) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Premium companions pass required." },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true as const,
    companion,
    entitlements,
  };
}

export async function getOwnedConversationForUser(
  userId: string,
  conversationId: string
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    select: {
      id: true,
      userId: true,
      companionId: true,
      contentRating: true,
      familiarity: true,
      trust: true,
      intimacy: true,
      kinkLevel: true,
      relationshipLevel: true,
      companionMood: true,
      summary: true,
    },
  });

  if (!conversation) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: "Conversation not found." },
        { status: 404 }
      ),
    };
  }

  return {
    ok: true as const,
    conversation,
  };
}

export async function getOwnedMessageForUser(userId: string, messageId: string) {
  const message = await prisma.chatMessage.findFirst({
    where: {
      id: messageId,
      conversation: {
        userId,
      },
    },
    select: {
      id: true,
      role: true,
      content: true,
      conversationId: true,
      isPinned: true,
      conversation: {
        select: {
          id: true,
          userId: true,
          companionId: true,
          contentRating: true,
        },
      },
    },
  });

  if (!message) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Message not found." }, { status: 404 }),
    };
  }

  return {
    ok: true as const,
    message,
  };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

