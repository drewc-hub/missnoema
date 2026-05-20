
// lib/rp-utils.ts
import {
  APPEARANCES,
  ARCHETYPES,
  DISLIKES,
  GOALS,
  LIKES,
  NAMES,
  ORIGINS,
  PERSONALITIES,
  PRONOUNS,
  SECRETS,
  TITLES,
} from '@/lib/rp-data';
import type { CharacterProfile } from '@/lib/rp-types';

export function randomOf<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createRandomCharacter(): CharacterProfile {
  const name = randomOf(NAMES);
  const title = randomOf(TITLES);

  return {
    name,
    title,
    archetype: randomOf(ARCHETYPES),
    age: String(18 + Math.floor(Math.random() * 200)),
    pronouns: randomOf(PRONOUNS),
    origin: randomOf(ORIGINS),
    personality: randomOf(PERSONALITIES),
    appearance: randomOf(APPEARANCES),
    likes: randomOf(LIKES),
    dislikes: randomOf(DISLIKES),
    secret: randomOf(SECRETS),
    goal: randomOf(GOALS),
    openingLine: `So... you're the one everyone keeps talking about. I'm ${name}, ${title.toLowerCase()}. Tell me why I should trust you.`,
  };
}

export function createRandomCharacterFieldValue(key: keyof CharacterProfile): string {
  switch (key) {
    case 'name':
      return randomOf(NAMES);
    case 'title':
      return randomOf(TITLES);
    case 'archetype':
      return randomOf(ARCHETYPES);
    case 'age':
      return String(18 + Math.floor(Math.random() * 200));
    case 'pronouns':
      return randomOf(PRONOUNS);
    case 'origin':
      return randomOf(ORIGINS);
    case 'personality':
      return randomOf(PERSONALITIES);
    case 'appearance':
      return randomOf(APPEARANCES);
    case 'likes':
      return randomOf(LIKES);
    case 'dislikes':
      return randomOf(DISLIKES);
    case 'secret':
      return randomOf(SECRETS);
    case 'goal':
      return randomOf(GOALS);
    case 'openingLine':
      return `Careful. People who get too close to me usually regret it. Still... I was hoping you'd stay.`;
    default:
      return '';
  }
}

export function serializeCharacterProfile(character: CharacterProfile, scene: string): string {
  return [
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
    `Scene: ${scene}`,
  ].join('\n');
}
