// app/api/conversations/[companionId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthedUser } from '@/lib/auth';
import type { RpClientMessage } from '@/lib/rp-chat-types';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ companionId: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { companionId } = await context.params;

    const user = await getAuthedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        userId_companionId: {
          userId: user.id,
          companionId,
        },
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ conversationId: null, messages: [] });
    }

    const messages: RpClientMessage[] = conversation.messages.map((message) => ({
      id: message.id,
      role: message.role === 'assistant' ? 'character' : (message.role as 'system' | 'user'),
      content: message.content,
    }));

    return NextResponse.json({
      conversationId: conversation.id,
      contentRating: conversation.contentRating,
      messages,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load conversation.' },
      { status: 500 }
    );
  }
}
