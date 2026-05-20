
// app/api/rp-chat/route.ts
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import type { CharacterProfile, ChatMessage } from '@/lib/rp-types';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    `Title: ${character.title}`,
    `Archetype: ${character.archetype}`,
    `Age: ${character.age}`,
    `Pronouns: ${character.pronouns}`,
    `Origin: ${character.origin}`,
    `Personality: ${character.personality}`,
    `Appearance: ${character.appearance}`,
    `Likes: ${character.likes}`,
    `Dislikes: ${character.dislikes}`,
    `Secret: ${character.secret}`,
    `Goal: ${character.goal}`,
    `Opening Line: ${character.openingLine}`,
    '',
    `Scene: ${scene}`,
  ].join('\n');
}

function formatMessages(messages: ChatMessage[]): string {
  return messages
    .map((message) => {
      if (message.role === 'user') return `User: ${message.content}`;
      if (message.role === 'character') return `Character: ${message.content}`;
      return `System: ${message.content}`;
    })
    .join('\n');
}

export async function POST(request: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Missing OPENAI_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = (await request.json()) as RequestBody;
    const { character, scene, messages } = body;

    if (!character || !scene || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(character, scene);
    const transcript = formatMessages(messages);

    const response = await client.responses.create({
      model: 'gpt-5.4-mini',
      input: [
        {
          role: 'system',
          content: [{ type: 'input_text', text: systemPrompt }],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: `Continue this roleplay conversation.\n\n${transcript}`,
            },
          ],
        },
      ],
    });

    const reply = response.output_text?.trim();

    if (!reply) {
      return NextResponse.json({ error: 'Model returned an empty reply.' }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown server error.',
      },
      { status: 500 }
    );
  }
}
