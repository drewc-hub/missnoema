export type Companion = {
  id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  gender?: string | null;
  profile: any;
  contentRating: "SAFE" | "ADULT";
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  thumbnailUrl?: string | null;
};

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  isPinned?: boolean;
};

export type UserFact = {
  id: string;
  fact: string;
  companionId: string | null;
  createdAt: string;
};

export type ConversationMemory = {
  id: string;
  familiarity: number;
  trust: number;
  intimacy: number;
  kinkLevel: number;
  relationshipLevel: number;
  summary?: string | null;
};

export type MediaHistoryItem = {
  id: string;
  type: "IMAGE" | "VIDEO";
  contentRating: "SAFE" | "ADULT";
  prompt: string;
  createdAt: string;
  url: string;
  isFavorite: boolean;
  isCover: boolean;
};
