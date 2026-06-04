import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { generateText } from "ai";
import { getProvider } from "@/lib/ai-client";
import { SpeakerType } from "@prisma/client";

export const runtime = "nodejs";

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

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { campaignId } = await context.params;
    const user = await getAuthedUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const content = String(body.content ?? "").trim();

    if (!content) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const campaign = await prisma.rpCampaign.findFirst({
      where: {
        id: campaignId,
        userId: user.id,
      },
      include: {
        sessions: {
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
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

    const systemPrompt = `
You are the roleplay engine for Noema.

There are three main voices:

NARRATOR:
- Describes the world, scene, atmosphere, actions, consequences, and story movement.
- Never lets the story stall.
- Avoids repetition.
- Advances the scene based on the user's action.

COMPANION:
- Responds as the user's companion inside the story.
- Reacts emotionally and physically to the scene.
- Does not narrate the whole world unless needed.

USER:
- Controls their own character only.

Return ONLY valid JSON.

Required format:
{
  "narrator": "Narrative scene response here.",
  "companion": "Companion dialogue/action here.",
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

Recent story:
${history}

Player action:
${content}
`;

    const provider = getProvider();

    const result = await generateText({
      model: provider("mistralai/mistral-small-3.2-24b-instruct"),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.9,
      maxTokens: 900,
    });

    const parsed = safeJsonParse(result.text);

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

    if (parsed.sceneChanged && parsed.imagePrompt?.trim()) {
      scene = await prisma.rpScene.create({
        data: {
          campaignId: campaign.id,
          title: parsed.newSceneTitle || "New Scene",
          location: parsed.newSceneLocation || null,
          mood: parsed.newSceneMood || null,
          summary: parsed.narrator || null,
          imagePrompt: parsed.imagePrompt,
        },
      });
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
      { status: 500 }
    );
  }
}
