import { NextRequest, NextResponse } from "next/server";
import { ContentRating, SpeakerType, Visibility } from "@prisma/client";
import { getAuthedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function textFromProfile(
  profile: unknown,
  keys: string[],
): string | undefined {
  if (!profile || typeof profile !== "object") return undefined;
  const record = profile as Record<string, unknown>;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function castJoinLine(name: string, existingCastCount: number) {
  return existingCastCount > 0
    ? `${name} joined this Story Mode campaign as another active character.`
    : `${name} joined this Story Mode campaign.`;
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const campaignId = String(body.campaignId ?? "").trim();
    const companionSlug = String(body.companionSlug ?? "").trim();
    const requestedTitle = String(body.title ?? "").trim();
    const requestedGenre = String(body.genre ?? "").trim();
    const requestedTone = String(body.tone ?? "").trim();

    const companion = companionSlug
      ? await prisma.companion.findFirst({
          where: {
            slug: companionSlug,
            contentRating: ContentRating.SAFE,
            OR: [
              { visibility: Visibility.PUBLIC },
              { ownerId: user.id },
            ],
          },
          select: {
            id: true,
            name: true,
            description: true,
            archetype: true,
            profile: true,
            scenario: true,
            greeting: true,
          },
        })
      : null;

    if (companionSlug && !companion) {
      return NextResponse.json(
        { error: "Companion not found" },
        { status: 404 },
      );
    }

    const sceneSeed =
      companion?.scenario ||
      textFromProfile(companion?.profile, ["scene", "scenario", "setting"]) ||
      "A new roleplay scene begins. The narrator frames the moment and waits for your first action.";
    const greeting =
      companion?.greeting ||
      textFromProfile(companion?.profile, ["greeting", "openingLine"]) ||
      (companion ? `${companion.name} watches the scene unfold.` : "");
    const title =
      requestedTitle ||
      (companion ? `Story with ${companion.name}` : "New Story Mode Campaign");
    const genre =
      requestedGenre ||
      companion?.archetype ||
      textFromProfile(companion?.profile, ["genre"]) ||
      "fantasy roleplay";
    const tone =
      requestedTone ||
      textFromProfile(companion?.profile, ["tone"]) ||
      "cinematic";

    if (campaignId) {
      const existingCampaign = await prisma.rpCampaign.findFirst({
        where: {
          id: campaignId,
          userId: user.id,
        },
        include: {
          sessions: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { id: true },
          },
          characters: {
            select: { companionId: true },
          },
        },
      });

      if (!existingCampaign) {
        return NextResponse.json(
          { error: "Campaign not found" },
          { status: 404 },
        );
      }

      const sessionId =
        existingCampaign.sessions[0]?.id ??
        (
          await prisma.rpSession.create({
            data: {
              campaignId: existingCampaign.id,
              title: existingCampaign.title,
            },
            select: { id: true },
          })
        ).id;

      await prisma.rpCampaign.update({
        where: { id: existingCampaign.id },
        data: {
          companionId: existingCampaign.companionId ?? companion?.id ?? null,
          title: companion && !existingCampaign.companionId
            ? `Story with ${companion.name}`
            : existingCampaign.title,
          genre: companion && !existingCampaign.genre ? genre : existingCampaign.genre,
          tone: companion && !existingCampaign.tone ? tone : existingCampaign.tone,
        },
      });

      if (companion) {
        const existingCastCount = existingCampaign.characters.length;
        const alreadyInCast = existingCampaign.characters.some(
          (character) => character.companionId === companion.id,
        );

        await prisma.rpCampaignCharacter.upsert({
          where: {
            campaignId_companionId: {
              campaignId: existingCampaign.id,
              companionId: companion.id,
            },
          },
          update: {},
          create: {
            campaignId: existingCampaign.id,
            companionId: companion.id,
            role: existingCastCount === 0 ? "primary" : "cast",
          },
        });

        if (!alreadyInCast) {
          await prisma.rpMessage.create({
            data: {
              campaignId: existingCampaign.id,
              sessionId,
              speakerType: SpeakerType.SYSTEM,
              content: castJoinLine(companion.name, existingCastCount),
            },
          });

          if (greeting) {
            await prisma.rpMessage.create({
              data: {
                campaignId: existingCampaign.id,
                sessionId,
                speakerType: SpeakerType.COMPANION,
                content: `${companion.name}: ${greeting}`,
              },
            });
          }
        }
      }

      return NextResponse.json({ campaignId: existingCampaign.id });
    }

    const campaign = await prisma.rpCampaign.create({
      data: {
        userId: user.id,
        companionId: companion?.id ?? null,
        title,
        genre,
        tone,
        sessions: {
          create: {
            title,
            summary: sceneSeed.slice(0, 500),
          },
        },
        scenes: {
          create: {
            title: "Opening Scene",
            location: null,
            mood: tone,
            summary: sceneSeed,
            imagePrompt: sceneSeed,
          },
        },
        ...(companion
          ? {
              characters: {
                create: {
                  companionId: companion.id,
                  role: "primary",
                },
              },
            }
          : {}),
      },
      select: {
        id: true,
        sessions: {
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { id: true },
        },
      },
    });

    const sessionId = campaign.sessions[0]?.id ?? null;

    await prisma.rpMessage.createMany({
      data: [
        {
          campaignId: campaign.id,
          sessionId,
          speakerType: SpeakerType.NARRATOR,
          content: sceneSeed,
        },
        ...(greeting
          ? [
              {
                campaignId: campaign.id,
                sessionId,
                speakerType: SpeakerType.COMPANION,
                content: companion ? `${companion.name}: ${greeting}` : greeting,
              },
            ]
          : []),
      ],
    });

    return NextResponse.json({ campaignId: campaign.id });
  } catch (error) {
    console.error("RP campaign create error:", error);
    return NextResponse.json(
      { error: "Failed to create roleplay campaign" },
      { status: 500 },
    );
  }
}
