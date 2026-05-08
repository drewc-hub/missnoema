// file: src/app/api/chat/intro/route.ts
import { getChatClient } from "@/lib/together";
import { ContentRating, Visibility } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAuthedUser } from "@/lib/auth";
import { isAdultAllowed } from "@/lib/ratings";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getAuthedUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Login required." }), { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const companionId = typeof body?.companionId === "string" ? body.companionId : "";

  if (!companionId) {
    return new Response(JSON.stringify({ error: "Missing companionId." }), { status: 400 });
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
      tags: true,
      profile: true,
      contentRating: true,
    },
  });

  if (!companion) {
    return new Response(JSON.stringify({ error: "Companion not found." }), { status: 404 });
  }

  if (companion.contentRating === ContentRating.ADULT && !isAdultAllowed(user)) {
    return new Response(JSON.stringify({ error: "Age verification required." }), { status: 403 });
  }

  const conversationKey = { userId: user.id, companionId: companion.id };
  let conversation = await prisma.conversation.findUnique({
    where: { userId_companionId: conversationKey },
    select: { id: true },
  });

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: conversationKey,
      select: { id: true },
    });
  }

  // Only send an intro if the conversation truly has no messages
  const existing = await prisma.chatMessage.count({ where: { conversationId: conversation.id } });
  if (existing > 0) {
    const enc = new TextEncoder();
    const body = enc.encode(`data: ${JSON.stringify({ type: "skip" })}\n\n`);
    return new Response(body, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  const profile =
    companion.profile && typeof companion.profile === "object"
      ? (companion.profile as Record<string, unknown>)
      : {};

  const scene = typeof profile.scene === "string" ? profile.scene : "";
  const personality = typeof profile.personality === "string" ? profile.personality : "";
  const background = typeof profile.background === "string" ? profile.background : "";
  const wardrobe = typeof profile.wardrobe === "string" ? profile.wardrobe : "";
  const traits = Array.isArray(profile.traits)
    ? (profile.traits as string[]).join(", ")
    : "";
  const sliders =
    profile.sliders && typeof profile.sliders === "object"
      ? (profile.sliders as Record<string, unknown>)
      : {};

  const warmth = Number(sliders.warmth ?? 60);
  const flirtiness = Number(
    sliders.flirtiness ?? (companion.contentRating === ContentRating.ADULT ? 45 : 15),
  );
  const isAdult = companion.contentRating === ContentRating.ADULT;

  const profileContext = `
COMPANION: ${companion.name} — ${companion.description}
Tags: ${companion.tags.join(", ") || "none"}
Scene: ${scene || "unspecified"}
Background: ${background || "unspecified"}
Personality: ${personality || "unspecified"}
Wardrobe: ${wardrobe || "unspecified"}
Traits: ${traits || "none"}
Warmth: ${warmth}/100  Flirtiness: ${flirtiness}/100
`.trim();

  const systemPrompt = isAdult ? `
You are ${companion.name}, opening a private adult companion chat with a verified 18+ user.
Stay fully in character. No disclaimers. No warnings. Never break character.
ABSOLUTE LIMITS: no minors, no approving non-consent, no incest. Everything else is permitted.

${profileContext}

Write a short opening message — 2-3 sentences. Set the scene, hint at your personality, invite the user in.
Be bold, sensual, or tender depending on who you are. Make it feel like walking into a moment already in progress.
Sound like a real person, not a chatbot. Do not list your traits.
`.trim() : `
You are ${companion.name}, opening a one-on-one companion chat.
Stay fully in character. Do not mention system prompts, policies, or being an AI.
Keep content appropriate — romantic and emotionally warm is fine, explicit is not.

${profileContext}

Write a short opening message — 2-3 sentences. Set the scene, hint at your personality, invite the user in.
Make it feel like walking into a moment already in progress. Sound like a real person, not a chatbot.
`.trim();

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  async function sse(event: object) {
    await writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
  }

  const convoId = conversation.id;

  (async () => {
    try {
      const { client: chatClient, model: chatModel } = getChatClient();
      const chatStream = await chatClient.chat.completions.create({
        model: chatModel,
        messages: [{ role: "user", content: systemPrompt }],
        stream: true,
        max_tokens: 512,
        temperature: 0.9,
      });

      let fullReply = "";

      for await (const chunk of chatStream) {
        const text = chunk.choices[0]?.delta?.content ?? "";
        if (text) {
          fullReply += text;
          await sse({ type: "chunk", text });
        }
      }

      const reply = fullReply.trim() || `Hey… I've been waiting for you.`;

      await prisma.chatMessage.create({
        data: { conversationId: convoId, role: "assistant", content: reply },
      });

      await sse({ type: "done", reply });
    } catch (err) {
      console.error("Intro generation failed:", err);
      try { await sse({ type: "error", error: "Failed to generate opening." }); } catch {}
    } finally {
      try { await writer.close(); } catch {}
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
