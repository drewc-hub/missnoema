// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import type { RpClientMessage } from '@/lib/rp-chat-types';

type PageProps = {
  companionId: string;
  supabaseUserId: string;
  initialGreeting?: string;
};

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Page({
  companionId,
  supabaseUserId,
  initialGreeting,
}: PageProps) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RpClientMessage[]>(() =>
    initialGreeting
      ? [{ id: createId(), role: 'character', content: initialGreeting }]
      : []
  );
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const response = await fetch(`/api/conversations/${companionId}`, {
        headers: {
          'x-supabase-user-id': supabaseUserId,
        },
        cache: 'no-store',
      });

      if (!response.ok) return;

      const data = (await response.json()) as {
        conversationId: string | null;
        messages: RpClientMessage[];
      };

      if (cancelled) return;

      setConversationId(data.conversationId);
      if (data.messages.length > 0) {
        setMessages(data.messages);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companionId, supabaseUserId]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: RpClientMessage = {
      id: createId(),
      role: 'user',
      content: trimmed,
    };

    const placeholderId = createId();
    const placeholder: RpClientMessage = {
      id: placeholderId,
      role: 'character',
      content: '',
    };

    const history = [...messages, userMessage];

    setMessages((prev) => [...prev, userMessage, placeholder]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/rp-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-supabase-user-id': supabaseUserId,
        },
        body: JSON.stringify({
          companionId,
          message: trimmed,
          messages: history,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to open stream.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';

        for (const chunk of chunks) {
          const lines = chunk.split('\n');
          const eventLine = lines.find((line) => line.startsWith('event: '));
          const dataLine = lines.find((line) => line.startsWith('data: '));

          if (!eventLine || !dataLine) continue;

          const event = eventLine.replace('event: ', '').trim();
          const data = JSON.parse(dataLine.replace('data: ', '').trim()) as {
            conversationId?: string;
            delta?: string;
            content?: string;
            messageId?: string;
            message?: string;
          };

          if (event === 'conversation' && data.conversationId) {
            setConversationId(data.conversationId);
          }

          if (event === 'delta' && typeof data.delta === 'string') {
            finalContent += data.delta;

            setMessages((prev) =>
              prev.map((message) =>
                message.id === placeholderId
                  ? { ...message, content: finalContent }
                  : message
              )
            );
          }

          if (event === 'done' && typeof data.content === 'string') {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === placeholderId
                  ? {
                      ...message,
                      id: data.messageId ?? message.id,
                      content: data.content,
                    }
                  : message
              )
            );
          }

          if (event === 'error') {
            throw new Error(data.message || 'Streaming failed.');
          }
        }
      }
    } catch (error) {
      setMessages((prev) =>
        prev
          .filter((message) => message.id !== placeholderId)
          .concat({
            id: createId(),
            role: 'system',
            content:
              error instanceof Error ? `Error: ${error.message}` : 'Error: stream failed.',
          })
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-sm text-zinc-400">
            Conversation: {conversationId ?? 'new'}
          </div>
        </div>

        <div className="min-h-[420px] space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user'
                  ? 'ml-auto max-w-[80%] rounded-2xl bg-pink-500 px-4 py-3 text-white'
                  : message.role === 'character'
                  ? 'max-w-[80%] rounded-2xl bg-zinc-800 px-4 py-3'
                  : 'mx-auto max-w-[80%] rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-zinc-400'
              }
            >
              {message.content || 'Typing...'}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3"
            placeholder="Write your message..."
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className="rounded-2xl bg-pink-500 px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </main>
  );
}
