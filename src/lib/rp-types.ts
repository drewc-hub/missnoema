
// lib/rp-types.ts
export type CharacterProfile = {
  name: string;
  title: string;
  archetype: string;
  age: string;
  pronouns: string;
  origin: string;
  personality: string;
  appearance: string;
  likes: string;
  dislikes: string;
  secret: string;
  goal: string;
  openingLine: string;
};

export type ChatMessage = {
  id: string;
  role: 'system' | 'user' | 'character';
  content: string;
};

export type CharacterFieldDefinition = {
  key: keyof CharacterProfile;
  label: string;
  multiline?: boolean;
};
