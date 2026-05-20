// lib/rp-chat-types.ts
import type { ContentRating } from '@prisma/client';

export type RpClientMessage = {
  id: string;
  role: 'system' | 'user' | 'character';
  content: string;
};

export type SendRpRequest = {
  companionId: string;
  message: string;
  messages: RpClientMessage[];
};

export type LoadedConversation = {
  conversationId: string;
  companionId: string;
  contentRating: ContentRating;
  messages: RpClientMessage[];
};
