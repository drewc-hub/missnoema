import { ContentRating, Visibility } from "@prisma/client";
import { NextResponse } from "next/server";
import type OpenAI from "openai";
import { getAuthedUser } from "@/lib/auth";
import { getOpenAI } from "@/lib/openai";
import {
  getUserEntitlementsMap,
  hasPremiumFeature,
  PremiumFeature,
} from "@/lib/premium";
import { prisma } from "@/lib/prisma";
import { isAdultAllowed } from "@/lib/ratings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const SIGNED_URL_TTL_SECONDS = 24 * 60 * 60;
const MAX_TTS_CHARACTERS = 4096;
const VOICE_RENDER_VERSION = "natural-v2";
const OPENAI_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "cedar",
  "coral",
  "echo",
  "fable",
  "marin",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
] as const;

type OpenAIVoice = (typeof OPENAI_VOICES)[number];

const PRESET_VOICES: Record<string, OpenAIVoice> = {
  "soft-young": "shimmer",
  "warm-sultry": "coral",
  "deep-breathy": "onyx",
  "playful-energetic": "nova",
  "mature-refined": "marin",
  "older-distinguished": "cedar",
  "dark-mysterious": "echo",
};

class VoiceRouteError extends Error {
  constructor(
    message: string,
    public status = 500,
  ) {
    super(message);
    this.name = "VoiceRouteError";
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanTTSInputText(value: string): string {
  return value
    .replace(/\*[^*]+\*/g, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(
      /\{(shake|shout|whisper|glow|pulse|wave|flicker|drip|bounce|tremble|glitch|expand):([^}]+)\}/gi,
      "$2",
    )
    .replace(/\[[a-z_]+:[^\]]*\]/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isOpenAIVoice(value: string): value is OpenAIVoice {
  return (OPENAI_VOICES as readonly string[]).includes(value);
}

function resolveVoice(profile: unknown, gender: string | null): OpenAIVoice {
  const profileRecord = asRecord(profile);
  const voiceMeta = asRecord(profileRecord.voiceMeta);
  const explicitVoice = stringValue(voiceMeta.voiceId).toLowerCase();
  if (isOpenAIVoice(explicitVoice)) return explicitVoice;

  const preset = stringValue(profileRecord.voice).toLowerCase();
  if (PRESET_VOICES[preset]) return PRESET_VOICES[preset];

  const normalizedGender = (gender ?? "").toLowerCase();
  if (normalizedGender.includes("female") || normalizedGender.includes("woman")) {
    return "coral";
  }
  if (normalizedGender.includes("male") || normalizedGender.includes("man")) {
    return "cedar";
  }
  return "marin";
}

function buildVoiceInstructions(companionName: string, profile: unknown): string {
  const profileRecord = asRecord(profile);
  const voiceMeta = asRecord(profileRecord.voiceMeta);
  const parts = [
    `Speak naturally as ${companionName}.`,
    stringValue(voiceMeta.tone) && `Tone: ${stringValue(voiceMeta.tone)}.`,
    stringValue(voiceMeta.accent) && `Accent: ${stringValue(voiceMeta.accent)}.`,
    stringValue(profileRecord.speakingStyle) &&
      `Speaking style: ${stringValue(profileRecord.speakingStyle)}.`,
    "Deliver this as intimate, spontaneous conversation, not narration or an announcement.",
    "Use natural pacing, varied intonation, contractions, brief conversational pauses, and subtle emotion.",
    "Avoid a polished presenter voice, exaggerated acting, sing-song cadence, and equal emphasis on every word.",
  ].filter(Boolean);

  return parts.join(" ").slice(0, 1000);
}

async function createSignedAudioUrl(bucket: string, path: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new VoiceRouteError(
      `Could not create signed audio URL: ${error?.message ?? "unknown error"}`,
    );
  }

  return {
    audioUrl: data.signedUrl,
    urlExpiresAt: new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000),
  };
}

export async function POST(req: Request) {
  try {
    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: "Login required." }, { status: 401 });
    }
    if (user.suspendedAt) {
      return NextResponse.json({ error: "Account suspended." }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const messageId = stringValue(body?.messageId);
    const companionId = stringValue(body?.companionId);
    if (!messageId || !companionId) {
      return NextResponse.json(
        { error: "messageId and companionId are required." },
        { status: 400 },
      );
    }

    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        role: "assistant",
        conversation: {
          userId: user.id,
          companionId,
          companion: {
            OR: [{ ownerId: user.id }, { visibility: Visibility.PUBLIC }],
          },
        },
      },
      select: {
        id: true,
        content: true,
        conversation: {
          select: {
            companion: {
              select: {
                id: true,
                name: true,
                gender: true,
                profile: true,
                contentRating: true,
              },
            },
          },
        },
      },
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found." }, { status: 404 });
    }

    const companion = message.conversation.companion;
    if (
      companion.contentRating === ContentRating.ADULT &&
      !isAdultAllowed(user)
    ) {
      return NextResponse.json(
        { error: "Age verification required." },
        { status: 403 },
      );
    }

    const entitlements = await getUserEntitlementsMap(user.id);
    if (
      companion.contentRating === ContentRating.ADULT &&
      !hasPremiumFeature(entitlements, PremiumFeature.NSFW_UNLOCKS, user.plan)
    ) {
      return NextResponse.json(
        { error: "NSFW unlock required." },
        { status: 403 },
      );
    }

    const profile = asRecord(companion.profile);
    if (
      profile.premiumOnly === true &&
      !hasPremiumFeature(
        entitlements,
        PremiumFeature.PREMIUM_COMPANIONS,
        user.plan,
      )
    ) {
      return NextResponse.json(
        { error: "Premium companions pass required." },
        { status: 403 },
      );
    }

    const model = process.env.OPENAI_TTS_MODEL?.trim() || "gpt-4o-mini-tts";
    const voice = resolveVoice(companion.profile, companion.gender);
    const cachedModel = `${model}:${VOICE_RENDER_VERSION}`;
    const cached = await prisma.messageAudio.findUnique({
      where: { messageId: message.id },
    });
    if (
      cached &&
      cached.provider === "openai" &&
      cached.voiceId === voice &&
      cached.model === cachedModel
    ) {
      const signed = await createSignedAudioUrl(
        cached.storageBucket,
        cached.storagePath,
      );
      await prisma.messageAudio.update({
        where: { id: cached.id },
        data: signed,
      });
      return NextResponse.json({ ...signed, cached: true });
    }

    const input = cleanTTSInputText(message.content).slice(
      0,
      MAX_TTS_CHARACTERS,
    );
    if (!input) {
      return NextResponse.json(
        { error: "Message has no speakable text." },
        { status: 400 },
      );
    }

    const request: OpenAI.Audio.Speech.SpeechCreateParams = {
      model,
      voice,
      input,
      response_format: "mp3",
      ...(model.startsWith("gpt-4o-mini-tts")
        ? {
            instructions: buildVoiceInstructions(
              companion.name,
              companion.profile,
            ),
          }
        : {}),
    };
    const speech = await getOpenAI().audio.speech.create(request);
    const audioBytes = new Uint8Array(await speech.arrayBuffer());

    const bucket =
      companion.contentRating === ContentRating.ADULT
        ? process.env.SUPABASE_STORAGE_BUCKET_ADULT ?? "companion-media-adult"
        : process.env.SUPABASE_STORAGE_BUCKET_AUDIO ??
          process.env.SUPABASE_STORAGE_BUCKET_SAFE ??
          process.env.SUPABASE_STORAGE_BUCKET_COMPANION_MEDIA ??
          "companion-media";
    const storagePath = `generated-audio/messages/${companion.id}/${message.id}.mp3`;
    const supabase = createSupabaseAdminClient();
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(storagePath, audioBytes, {
        contentType: "audio/mpeg",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      throw new VoiceRouteError(`Audio upload failed: ${uploadError.message}`);
    }

    const signed = await createSignedAudioUrl(bucket, storagePath);
    await prisma.messageAudio.upsert({
      where: { messageId: message.id },
      update: {
        companionId: companion.id,
        provider: "openai",
        voiceId: voice,
        model: cachedModel,
        storageBucket: bucket,
        storagePath,
        ...signed,
      },
      create: {
        messageId: message.id,
        companionId: companion.id,
        provider: "openai",
        voiceId: voice,
        model: cachedModel,
        storageBucket: bucket,
        storagePath,
        contentType: "audio/mpeg",
        ...signed,
      },
    });

    return NextResponse.json({ ...signed, cached: false });
  } catch (error) {
    console.error("POST /api/voice/message failed", error);
    if (error instanceof VoiceRouteError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    const message =
      error instanceof Error ? error.message : "Voice generation failed.";
    return NextResponse.json(
      { error: message || "Voice generation failed." },
      { status: 500 },
    );
  }
}
