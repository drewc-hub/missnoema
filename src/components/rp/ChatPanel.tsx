// components/rp/ChatPanel.tsx
'use client';

import type { ChatMessage } from '@/lib/rp-types';

type ChatPanelProps = {
  characterName: string;
  input: string;
  isLoading: boolean;
  messages: ChatMessage[];
  onChangeInput: (value: string) => void;
  onClearChat: () => void;
  onSendMessage: () => void;
  onUseOpeningLine: () => void;
};

export function ChatPanel({
  characterName,
  input,
  isLoading,
  messages,
  onChangeInput,
  onClearChat,
  onSendMessage,
  onUseOpeningLine,
}: ChatPanelProps) {
  return (
    <section className="rounded-3xl border border-zinc-900 bg-zinc-950 p-5 shadow-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">RP Chat</h2>
          <p className="text-sm text-zinc-400">Your messages are sent to the API route.</p>
        </div>
        <button
          onClick={onClearChat}
          className="rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
        >
          Clear Chat
        </button>
      </div>

      <div className="mb-4 flex max-h-[520px] min-h-[320px] flex-col gap-3 overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
        {messages.map((message) => {
          const isUser = message.role === 'user';
          const isSystem = message.role === 'system';

          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                isSystem
                  ? 'self-center border border-zinc-700 bg-zinc-900 text-zinc-400'
                  : isUser
                  ? 'self-end bg-pink-500 text-white'
                  : 'self-start bg-zinc-800 text-zinc-100'
              }`}
            >
              {!isSystem && (
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">
                  {isUser ? 'You' : characterName}
                </div>
              )}
              <div>{message.content}</div>
            </div>
          );
        })}

        {isLoading && (
          <div className="self-start rounded-2xl bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-75">
              {characterName}
            </div>
            <div>Typing...</div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row">
        <textarea
          value={input}
          onChange={(e) => onChangeInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          rows={3}
          placeholder="Write your RP message..."
          className="min-h-[88px] flex-1 rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none placeholder:text-zinc-500 focus:border-pink-400"
        />
        <div className="flex gap-3 md:w-[180px] md:flex-col">
          <button
            onClick={onSendMessage}
            disabled={isLoading}
            className="flex-1 rounded-2xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
          <button
            onClick={onUseOpeningLine}
            className="flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-semibold hover:bg-zinc-700"
          >
            Use Opening Line
          </button>
        </div>
      </div>
    </section>
  );
}
