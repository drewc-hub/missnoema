// app/api/rp-chat/route.ts
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth';
import { getOpenRouter, OPENROUTER_MODEL, OPENROUTER_FALLBACK } from '@/lib/together';
import type { RpClientMessage, SendRpRequest } from '@/lib/rp-chat-types';

export const runtime = 'nodejs';

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
    if (!process.env.OPENROUTER_API_KEY) {
        return new Response(
            sse('error', { message: 'Missing OPENROUTER_API_KEY.' }),
            {
                status: 500,
                headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
            }
        );
    }

    const user = await getAuthedUser();
    if (!user) {
        return new Response(
            sse('error', { message: 'Login required.' }),
            {
                status: 401,
                headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
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
                headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
            }
        );
    }

    const { companionId, message, messages } = body;
    if (!companionId || !message || !Array.isArray(messages)) {
        return new Response(
            sse('error', { message: 'Missing required fields.' }),
            {
                status: 400,
                headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
            }
        );
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
        async start(controller) {
            let finalReply = '';

            try {
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
                    controller.enqueue(encoder.encode(sse('error', { message: 'Companion not found.' })));
                    controller.close();
                    return;
                }

                const conversation = await prisma.conversation.upsert({
                    where: { userId_companionId: { userId: user.id, companionId: companion.id } },
                    update: { lastActiveAt: new Date(), updatedAt: new Date(), contentRating: companion.contentRating },
                    create: { userId: user.id, companionId: companion.id, contentRating: companion.contentRating, lastActiveAt: new Date() },
                    select: { id: true, contentRating: true },
                });

                controller.enqueue(encoder.encode(sse('conversation', { conversationId: conversation.id, contentRating: conversation.contentRating })));

                await prisma.chatMessage.create({
                    data: { conversationId: conversation.id, role: 'user', content: message, contentRating: companion.contentRating },
                });

                const systemPrompt = buildSystemPrompt({
                    companionName: companion.name,
                    archetype: companion.archetype,
                    description: companion.description,
                    scenario: companion.scenario,
                    greeting: companion.greeting,
                    profile: companion.profile,
                });

                const client = getOpenRouter();
                const modelMessages = [
                    { role: 'system' as const, content: systemPrompt },
                    ...toModelInput(messages),
                ];

                // Try primary model, fall back to fallback on rate-limit/quota errors
                let response: AsyncIterable<import('openai').OpenAI.Chat.ChatCompletionChunk>;
                try {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    response = await (client.chat.completions.create as any)({ model: OPENROUTER_MODEL, messages: modelMessages, stream: true, max_tokens: 1200, temperature: 0.75 });
                } catch (err: unknown) {
                    const status = (err as { status?: number })?.status;
                    if (status === 429 || status === 402 || (status && status >= 500)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        response = await (client.chat.completions.create as any)({ model: OPENROUTER_FALLBACK, messages: modelMessages, stream: true, max_tokens: 1200, temperature: 0.75 });
                    } else {
                        throw err;
                    }
                }

                for await (const chunk of response) {
                    const delta = chunk.choices[0]?.delta?.content ?? '';
                    if (delta) {
                        finalReply += delta;
                        controller.enqueue(encoder.encode(sse('delta', { delta })));
                    }
                }

                finalReply = finalReply.trim();
                if (!finalReply) {
                    controller.enqueue(encoder.encode(sse('error', { message: 'Model returned an empty reply.' })));
                    controller.close();
                    return;
                }

                const saved = await prisma.chatMessage.create({
                    data: { conversationId: conversation.id, role: 'assistant', content: finalReply, contentRating: companion.contentRating },
                    select: { id: true, content: true },
                });

                await prisma.conversation.update({
                    where: { id: conversation.id },
                    data: { lastActiveAt: new Date(), updatedAt: new Date() },
                });

                controller.enqueue(encoder.encode(sse('done', { messageId: saved.id, content: saved.content })));
            } catch (error) {
                controller.enqueue(
                    encoder.encode(sse('error', { message: error instanceof Error ? error.message : 'Unknown server error.' }))
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
