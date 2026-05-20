// app/api/rp-chat/route.ts
import { NextResponse } from 'next/server';
import { getOpenRouter, OPENROUTER_MODEL, OPENROUTER_FALLBACK } from '@/lib/together';
import type { CharacterProfile, ChatMessage } from '@/lib/rp-types';

export const runtime = 'nodejs';

type RequestBody = {
  character: CharacterProfile;
  scene: string;
  messages: ChatMessage[];
};

function buildSystemPrompt(character: CharacterProfile, scene: string): string {
  return [
    'You are roleplaying as the following fictional character.',
    'Stay in character unless safety requires otherwise.',
    'Write immersive, dialogue-forward responses.',
    'Keep replies concise to medium length unless the user asks for more.',
    'Do not speak for the user.',
    '',
    `Name: ${character.name}`,
    `Title: ${character.title ?? ''}`,
    `Archetype: ${character.archetype ?? ''}`,
    `Age: ${character.age ?? ''}`,
    `Pronouns: ${character.pronouns ?? ''}`,
    `Origin: ${character.origin ?? ''}`,
    `Personality: ${character.personality ?? ''}`,
    `Appearance: ${character.appearance ?? ''}`,
    `Likes: ${character.likes ?? ''}`,
    `Dislikes: ${character.dislikes ?? ''}`,
    `Secret: ${character.secret ?? ''}`,
    `Goal: ${character.goal ?? ''}`,
    `Opening Line: ${character.openingLine ?? ''}`,
    '',
    `Scene: ${scene}`,
  ].join('\n');
}

export async function POST(request: Request) {
  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: 'Missing OPENROUTER_API_KEY.' }, { status: 500 });
  }

  try {
    const body = (await request.json()) as RequestBody;
    const { character, scene, messages } = body;

    if (!character || !scene || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(character, scene);

    const modelMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role === 'character' ? ('assistant' as const) : m.role === 'system' ? ('system' as const) : ('user' as const),
        content: m.content,
      })),
    ];

    const client = getOpenRouter();

    let reply: string | null | undefined;

    try {
      const response = await client.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: modelMessages,
        max_tokens: 1200,
        temperature: 0.75,
      });
      reply = response.choices[0]?.message?.content?.trim();
    } catch {
      const response = await client.chat.completions.create({
        model: OPENROUTER_FALLBACK,
        messages: modelMessages,
        max_tokens: 1200,
        temperature: 0.75,
      });
      reply = response.choices[0]?.message?.content?.trim();
    }

    if (!reply) {
      return NextResponse.json({ error: 'Model returned an empty reply.' }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown server error.' },
      { status: 500 }
    );
  }
}
