import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { chatCompletion } from "@/lib/together";
import { generateSafeImage } from "@/lib/gen/openai-image";
import { SpeakerType } from "@prisma/client";

export const runtime = "nodejs";

const RP_IMAGE_TURN_INTERVAL = 4;

type RpAIResponse = {
  narrator: string;
  companion: string;
  sceneChanged?: boolean;
  imagePrompt?: string;
  newSceneTitle?: string;
  newSceneLocation?: string;
  newSceneMood?: string;
};

function safeJsonParse(text: string): RpAIResponse {
  try {
    const cleaned = text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    return JSON.parse(cleaned);
  } catch {
    return {
      narrator: text,
      companion: "",
      sceneChanged: false,
    };
  }
}

async function shouldIllustrateScene(campaignId: string) {
  const latestIllustratedScene = await prisma.rpScene.findFirst({
    where: {
      campaignId,
      imageUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (!latestIllustratedScene) return true;

  const userTurnsSinceLastImage = await prisma.rpMessage.count({
    where: {
      campaignId,
      speakerType: SpeakerType.USER,
      createdAt: { gt: latestIllustratedScene.createdAt },
    },
  });

  return userTurnsSinceLastImage >= RP_IMAGE_TURN_INTERVAL;
}

async function generateSceneImage(prompt: string) {
  try {
    return await generateSafeImage(
      [
        "Cinematic roleplay scene illustration.",
        "Full-body, head-to-toe framing for visible characters.",
        "Keep every face, head, feet, and important object fully inside the frame with generous safe margins.",
        "Wide or full-frame composition, not a close-up portrait, not cropped, not zoomed in.",
        "No text, no watermark, no UI elements.",
        "Detailed environment, clear subject, dramatic lighting.",
        prompt,
      ].join(" "),
    );
  } catch (error) {
    console.error("RP scene image generation failed:", error);
    return null;
  }
}

function buildFallbackImagePrompt(args: {
  campaignTitle: string;
  genre?: string | null;
  tone?: string | null;
  narrator?: string;
  playerAction: string;
  castNames?: string[];
}) {
  return [
    `Campaign: ${args.campaignTitle}.`,
    `Genre: ${args.genre ?? "roleplay"}.`,
    `Tone: ${args.tone ?? "cinematic"}.`,
    args.castNames?.length ? `Characters in scene: ${args.castNames.join(", ")}.` : null,
    args.narrator
      ? `Current scene: ${args.narrator}`
      : `Player action: ${args.playerAction}`,
  ].filter(Boolean).join(" ");
}

async function rpRosterTableExists() {
  try {
    const result = await prisma.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'RpCampaignCharacter'
      ) AS "exists"
    `;
    return Boolean(result[0]?.exists);
  } catch {
    return false;
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ campaignId: string }> },
) {
  try {
    const { campaignId } = await context.params;
    const safeCampaignId = String(campaignId ?? "").trim();
    const user = await getAuthedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!safeCampaignId || safeCampaignId.startsWith("[")) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    const body = await req.json();
    const content = String(body.content ?? "").trim();
    const hasRosterTable = await rpRosterTableExists();

    if (!content) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const campaign = await prisma.rpCampaign.findFirst({
      where: {
        id: safeCampaignId,
        userId: user.id,
      },
      include: {
        sessions: {
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
        ...(hasRosterTable
          ? {
              characters: {
                orderBy: { joinedAt: "asc" },
                include: {
                  companion: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      archetype: true,
                      profile: true,
                      scenario: true,
                      greeting: true,
                      tags: true,
                    },
                  },
                },
              },
            }
          : {}),
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 },
      );
    }

    let session = campaign.sessions[0];

    if (!session) {
      session = await prisma.rpSession.create({
        data: {
          campaignId: campaign.id,
          title: campaign.title,
        },
      });
    }

    const userMessage = await prisma.rpMessage.create({
      data: {
        campaignId: campaign.id,
        sessionId: session.id,
        speakerType: SpeakerType.USER,
        content,
      },
    });

    const recentMessages = await prisma.rpMessage.findMany({
      where: {
        campaignId: campaign.id,
        sessionId: session.id,
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const history = recentMessages
      .reverse()
      .map((m) => `${m.speakerType}: ${m.content}`)
      .join("\n\n");

    const campaignCharacters =
      "characters" in campaign && Array.isArray(campaign.characters)
        ? campaign.characters
        : [];
    const legacyCompanion = campaign.companionId && campaignCharacters.length === 0
      ? await prisma.companion.findUnique({
          where: { id: campaign.companionId },
          select: {
            id: true,
            name: true,
            description: true,
            archetype: true,
            profile: true,
            scenario: true,
            greeting: true,
            tags: true,
          },
        })
      : null;
    const cast = [
      ...campaignCharacters.map((character) => character.companion),
      ...(legacyCompanion ? [legacyCompanion] : []),
    ];
    const castPrompt = cast.length > 0
      ? cast
          .map((companion, index) => {
            const profile = companion.profile && typeof companion.profile === "object"
              ? (companion.profile as Record<string, unknown>)
              : {};
            const personality =
              typeof profile.personality === "string" ? profile.personality : "";
            const traits = Array.isArray(companion.tags) && companion.tags.length
              ? companion.tags.slice(0, 6).join(", ")
              : "";

            return [
              `${index + 1}. ${companion.name}`,
              companion.archetype ? `Archetype: ${companion.archetype}` : null,
              companion.description ? `Description: ${companion.description}` : null,
              personality ? `Personality: ${personality}` : null,
              traits ? `Tags: ${traits}` : null,
              companion.scenario ? `Scenario hook: ${companion.scenario}` : null,
            ].filter(Boolean).join("\n");
          })
          .join("\n\n")
      : "No companion cast has been added yet. Use only narrator responses until characters join.";

    const systemPrompt = `
You are the roleplay engine for Noema.

There are three main voice groups:

NARRATOR:
- Describes the world, scene, atmosphere, actions, consequences, and story movement.
- Never lets the story stall.
- Avoids repetition.
- Advances the scene based on the user's action.

COMPANION CAST:
- Responds as the active characters inside the story.
- If multiple characters are present, write each useful character beat by name, such as "Ari: ..." and "Mira: ...".
- Characters can talk to the user and to each other.
- Keep each character distinct and consistent with the cast notes.
- Do not make every character speak every turn unless the scene calls for it.
- Does not narrate the whole world unless needed.

USER:
- Controls their own character only.

Return ONLY valid JSON.

Required format:
{
  "narrator": "Narrative scene response here.",
  "companion": "Named companion dialogue/action here. Use multiple named lines when multiple cast members respond.",
  "sceneChanged": false,
  "imagePrompt": "",
  "newSceneTitle": "",
  "newSceneLocation": "",
  "newSceneMood": ""
}

Image rules:
- Set sceneChanged true when the location, mood, major event, monster, romantic scene, battle, or visual environment changes.
- When sceneChanged is true, create a rich cinematic imagePrompt.
- imagePrompt should describe the scene only, not UI text.
`;

    const userPrompt = `
Campaign title: ${campaign.title}
Genre: ${campaign.genre ?? "roleplay"}
Tone: ${campaign.tone ?? "cinematic"}

Active cast:
${castPrompt}

Current memory:
${session.summary ?? "No session summary yet."}

Recent story:
${history}

Player action:
${content}
`;

    const result = await chatCompletion({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.9,
      max_tokens: 900,
    });

    const parsed = safeJsonParse(result.choices[0]?.message?.content ?? "");

    const createdMessages = [];

    if (parsed.narrator?.trim()) {
      const narratorMessage = await prisma.rpMessage.create({
        data: {
          campaignId: campaign.id,
          sessionId: session.id,
          speakerType: SpeakerType.NARRATOR,
          content: parsed.narrator.trim(),
          metadata: {
            sceneChanged: parsed.sceneChanged ?? false,
            imagePrompt: parsed.imagePrompt ?? null,
          },
        },
      });

      createdMessages.push(narratorMessage);
    }

    if (parsed.companion?.trim()) {
      const companionMessage = await prisma.rpMessage.create({
        data: {
          campaignId: campaign.id,
          sessionId: session.id,
          speakerType: SpeakerType.COMPANION,
          content: parsed.companion.trim(),
        },
      });

      createdMessages.push(companionMessage);
    }

    let scene = null;

    const shouldGenerateImage = await shouldIllustrateScene(campaign.id);
    const illustrationPrompt =
      parsed.imagePrompt?.trim() ||
      (shouldGenerateImage
        ? buildFallbackImagePrompt({
            campaignTitle: campaign.title,
            genre: campaign.genre,
            tone: campaign.tone,
            narrator: parsed.narrator,
            playerAction: content,
            castNames: cast.map((companion) => companion.name),
          })
        : "");

    if ((parsed.sceneChanged || shouldGenerateImage) && illustrationPrompt) {
      const imageUrl = shouldGenerateImage
        ? await generateSceneImage(illustrationPrompt)
        : null;

      scene = await prisma.rpScene.create({
        data: {
          campaignId: campaign.id,
          title:
            parsed.newSceneTitle ||
            (parsed.sceneChanged ? "New Scene" : "Story Moment"),
          location: parsed.newSceneLocation || null,
          mood: parsed.newSceneMood || null,
          summary: parsed.narrator || null,
          imagePrompt: illustrationPrompt,
          imageUrl,
        },
      });

      if (imageUrl) {
        const imageMessage = await prisma.rpMessage.create({
          data: {
            campaignId: campaign.id,
            sessionId: session.id,
            speakerType: SpeakerType.IMAGE,
            content: scene.title,
            imageUrl,
            metadata: {
              sceneId: scene.id,
              imagePrompt: illustrationPrompt,
            },
          },
        });

        createdMessages.push(imageMessage);
      }
    }

    await prisma.rpSession.update({
      where: { id: session.id },
      data: {
        updatedAt: new Date(),
        currentSceneId: scene?.id ?? session.currentSceneId,
        summary: parsed.narrator?.slice(0, 500) ?? session.summary,
      },
    });

    await prisma.rpCampaign.update({
      where: { id: campaign.id },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      userMessage,
      messages: createdMessages,
      scene,
      imagePrompt: parsed.imagePrompt ?? null,
      sceneChanged: parsed.sceneChanged ?? false,
    });
  } catch (error) {
    console.error("RP message error:", error);

    return NextResponse.json(
      { error: "Failed to process roleplay message" },
      { status: 500 },
    );
  }
}
