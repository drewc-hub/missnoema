import { NextResponse } from "next/server";
import { ContentRating, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { characterCardFromCompanion } from "@/lib/character-card-v2";
import { prisma } from "@/lib/prisma";
import { PremiumFeature, getUserEntitlementsMap, hasPremiumFeature, isPremiumOnlyProfile } from "@/lib/premium";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const user = await getAuthedUser();

  const companion = await prisma.companion.findUnique({
    where: { slug },
    select: {
      id: true,
      ownerId: true,
      slug: true,
      name: true,
      description: true,
      tags: true,
      visibility: true,
      contentRating: true,
      profile: true,
    },
  });

  if (!companion) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const isOwner = !!user && companion.ownerId === user.id;
  if (companion.visibility !== Visibility.PUBLIC && !isOwner) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (companion.contentRating === ContentRating.ADULT) {
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }
    if (!isAdultAllowed(user)) {
      return NextResponse.json({ error: "Age verification required." }, { status: 403 });
    }

    const entitlements = await getUserEntitlementsMap(user.id);
    if (!hasPremiumFeature(entitlements, PremiumFeature.NSFW_UNLOCKS)) {
      return NextResponse.json({ error: "NSFW unlock required." }, { status: 403 });
    }
  }

  if (isPremiumOnlyProfile(companion.profile) && !isOwner) {
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }
    const entitlements = await getUserEntitlementsMap(user.id);
    if (!hasPremiumFeature(entitlements, PremiumFeature.PREMIUM_COMPANIONS)) {
      return NextResponse.json(
        { error: "Premium companions pass required." },
        { status: 403 },
      );
    }
  }

  const card = characterCardFromCompanion({
    name: companion.name,
    description: companion.description,
    tags: companion.tags,
    contentRating: companion.contentRating,
    profile: companion.profile,
  });

  return NextResponse.json(card, {
    headers: {
      "Content-Disposition": `attachment; filename="${companion.slug}.character-card-v2.json"`,
    },
  });
}
