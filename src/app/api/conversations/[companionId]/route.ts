// app/api/conversations/[companionId]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAppUserBySupabaseUserId } from '@/lib/auth-user';
import type { RpClientMessage } from '@/lib/rp-chat-types';

type Context = {
  params: Promise<{ companionId: string }>;
};

export async function GET(request: Request, context: Context) {
  try {
    const { companionId } = await context.params;
    const supabaseUserId = request.headers.get('x-supabase-user-id');

    if (!supabaseUserId) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const user = await getAppUserBySupabaseUserId(supabaseUserId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
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
      return NextResponse.json({
        conversationId: null,
        messages: [],
      });
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
