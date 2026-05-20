// app/api/rp-chat/route.ts
import OpenAI from 'openai';
import { NextResponse } from 'next/server';
import { ContentRating } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAppUserBySupabaseUserId } from '@/lib/auth-user';
import type { RpClientMessage, SendRpRequest } from '@/lib/rp-chat-types';

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

function sse(event: string, data: unknown) {
    return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function toModelInput(messages: RpClientMessage[]) {
    return messages.map((message) => ({
        role:
            message.role === 'character'
                ? ('assistant' as const)
                : message.role === 'system'
                    ? ('system' as const)
                    : ('user' as const),
        content: message.content,
    }));
}

function buildSystemPrompt(params: {
    companionName: string;
    archetype: string | null;
    description: string;
    scenario: string | null;
    greeting: string | null;
    profile: unknown;
}) {
    const { companionName, archetype, description, scenario, greeting, profile } = params;

    return [
        `You are roleplaying as ${companionName}.`,
        'Stay fully in character unless safety requires otherwise.',
        'Do not speak for the user.',
        'Write immersive, dialogue-forward replies.',
        'Keep responses concise to medium length unless asked otherwise.',
        '',
        `Name: ${companionName}`,
        `Archetype: ${archetype ?? 'Unknown'}`,
        `Description: ${description}`,
        `Scenario: ${scenario ?? 'None provided'}`,
        `Greeting: ${greeting ?? 'None provided'}`,
        `Profile JSON: ${JSON.stringify(profile)}`,
    ].join('\n');
}

export async function POST(request: Request) {
    if (!process.env.OPENAI_API_KEY) {
        return new Response(
            sse('error', { message: 'Missing OPENAI_API_KEY.' }),
            {
                status: 500,
                headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    Connection: 'keep-alive',
                },
            }
        );
    }

    const supabaseUserId = request.headers.get('x-supabase-user-id');
    if (!supabaseUserId) {
        return new Response(
            sse('error', { message: 'Missing authenticated user.' }),
            {
                status: 401,
                headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    Connection: 'keep-alive',
                },
            }
        );
    }

    let body: SendRpRequest;

    try {
        body = (await request.json()) as SendRpRequest;
    } catch {
        return new Response(
            sse('error', { message: 'Invalid JSON body.' }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    Connection: 'keep-alive',
                },
            }
        );
    }

    const { companionId, message, messages } = body;

    if (!companionId || !message || !Array.isArray(messages)) {
        return new Response(
            sse('error', { message: 'Missing required fields.' }),
            {
                status: 400,
                headers: {
                    'Content-Type': 'text/event-stream; charset=utf-8',
                    'Cache-Control': 'no-cache, no-transform',
                    Connection: 'keep-alive',
                },
            }
        );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let finalReply = '';

            try {
                const user = await getAppUserBySupabaseUserId(supabaseUserId);

                if (!user) {
                    controller.enqueue(
                        encoder.encode(sse('error', { message: 'User record not found.' }))
                    );
                    controller.close();
                    return;
                }

                const companion = await prisma.companion.findUnique({
                    where: { id: companionId },
                    select: {
                        id: true,
                        name: true,
                        archetype: true,
                        description: true,
                        scenario: true,
                        greeting: true,
                        profile: true,
                        contentRating: true,
                    },
                });

                if (!companion) {
                    controller.enqueue(
                        encoder.encode(sse('error', { message: 'Companion not found.' }))
                    );
                    controller.close();
                    return;
                }

                const conversation = await prisma.conversation.upsert({
                    where: {
                        userId_companionId: {
                            userId: user.id,
                            companionId: companion.id,
                        },
                    },
                    update: {
                        lastActiveAt: new Date(),
                        updatedAt: new Date(),
                        contentRating: companion.contentRating,
                    },
                    create: {
                        userId: user.id,
                        companionId: companion.id,
                        contentRating: companion.contentRating,
                        lastActiveAt: new Date(),
                    },
                    select: {
                        id: true,
                        contentRating: true,
                    },
                });

                controller.enqueue(
                    encoder.encode(
                        sse('conversation', {
                            conversationId: conversation.id,
                            contentRating: conversation.contentRating,
                        })
                    )
                );

                await prisma.chatMessage.create({
                    data: {
                        conversationId: conversation.id,
                        role: 'user',
                        content: message,
                        contentRating: companion.contentRating,
                    },
                });

                const response = await client.responses.create({
                    model: 'gpt-5.4-mini',
                    stream: true,
                    input: [
                        {
                            role: 'system',
                            content: buildSystemPrompt({
                                companionName: companion.name,
                                archetype: companion.archetype,
                                description: companion.description,
                                scenario: companion.scenario,
                                greeting: companion.greeting,
                                profile: companion.profile,
                            }),
                        },
                        ...toModelInput(messages),
                    ],
                });

                for await (const event of response) {
                    if (event.type === 'response.output_text.delta') {
                        const delta = event.delta ?? '';
                        finalReply += delta;
                        controller.enqueue(encoder.encode(sse('delta', { delta })));
                    }

                    if (event.type === 'error') {
                        controller.enqueue(
                            encoder.encode(sse('error', { message: 'Model stream error.' }))
                        );
                    }
                }

                finalReply = finalReply.trim();

                if (!finalReply) {
                    controller.enqueue(
                        encoder.encode(sse('error', { message: 'Model returned an empty reply.' }))
                    );
                    controller.close();
                    return;
                }

                const saved = await prisma.chatMessage.create({
                    data: {
                        conversationId: conversation.id,
                        role: 'assistant',
                        content: finalReply,
                        contentRating: companion.contentRating,
                    },
                    select: {
                        id: true,
                        content: true,
                    },
                });

                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: {
                        lastActiveAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                controller.enqueue(
                    encoder.encode(
                        sse('done', {
                            messageId: saved.id,
                            content: saved.content,
                        })
                    )
                );
            } catch (error) {
                controller.enqueue(
                    encoder.encode(
                        sse('error', {
                            message: error instanceof Error ? error.message : 'Unknown server error.',
                        })
                    )
                );
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive',
        },
    });
}
