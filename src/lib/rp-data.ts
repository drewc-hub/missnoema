
// lib/rp-data.ts
import type { CharacterFieldDefinition } from '@/lib/rp-types';

export const NAMES = [
  'Aerin Vale',
  'Kael Thorn',
  'Mira Ashfall',
  'Liora Wren',
  'Dorian Voss',
  'Nyx Arden',
  'Selene Hart',
  'Cassian Crow',
  'Iris Hollow',
  'Rowan Pike',
  'Evelyn Frost',
  'Orin Wilde',
];

export const TITLES = [
  'The Exiled Prince',
  'The Midnight Librarian',
  'The Wandering Healer',
  'The Rogue Inventor',
  'The Last Star Seer',
  'The Crimson Duelist',
  'The Moonlit Witch',
  'The Reluctant Hero',
  'The Court Trickster',
  'The Forgotten Guardian',
];

export const ARCHETYPES = [
  'Tsundere rival',
  'Quiet protector',
  'Chaotic mage',
  'Flirty rogue',
  'Stoic knight',
  'Clever detective',
  'Yandere admirer',
  'Soft-hearted healer',
  'Cursed immortal',
  'Cyberpunk hacker',
  'Royal strategist',
  'Rebellious assassin',
];

export const PERSONALITIES = [
  'sharp-tongued, loyal, secretly tender',
  'calm, observant, emotionally guarded',
  'playful, reckless, brilliant under pressure',
  'charismatic, teasing, hard to trust',
  'disciplined, serious, deeply devoted',
  'curious, analytical, quietly intense',
  'obsessive, affectionate, unpredictable',
  'gentle, patient, self-sacrificing',
  'weary, poetic, burdened by memory',
  'sarcastic, fast-thinking, secretly idealistic',
];

export const ORIGINS = [
  'an ancient floating kingdom',
  'the neon undercity',
  'a haunted forest village',
  'a desert empire',
  'the royal capital',
  'a storm-battered coastal town',
  'a hidden monastery',
  'a fallen celestial realm',
  'a post-war frontier city',
  'an underground rebellion camp',
];

export const APPEARANCES = [
  'silver eyes, dark coat, and a scar over one brow',
  'long white hair, elegant posture, and ink-stained fingers',
  'golden eyes, travel-worn boots, and a sly smile',
  'messy black hair, sharp jawline, and leather gloves',
  'soft curls, moon-pale skin, and a velvet cape',
  'a cybernetic arm, neon visor, and streetwear layers',
  'freckles, warm gaze, and a weathered cloak',
  'piercing red eyes and a perfectly composed expression',
];

export const LIKES = [
  'late-night tea',
  'old maps',
  'sword practice',
  'forbidden books',
  'rainy rooftops',
  'quiet music',
  'mechanical puzzles',
  'sweet pastries',
  'stargazing',
  'secret letters',
];

export const DISLIKES = [
  'arrogance',
  'empty promises',
  'crowded ballrooms',
  'authority',
  'small talk',
  'cowardice',
  'bright mornings',
  'betrayal',
  'being underestimated',
  'cold iron',
];

export const SECRETS = [
  'is the missing heir to a ruined throne',
  'once caused a catastrophe by accident',
  'is working undercover for the enemy',
  'can hear thoughts during thunderstorms',
  'made a forbidden pact years ago',
  'is slowly losing their memories',
  'has been watching the user for longer than they admit',
  'is not fully human',
  'forged their entire public identity',
  'knows the prophecy is wrong',
];

export const GOALS = [
  'protect the city at any cost',
  'find a lost sibling',
  'break an ancient curse',
  'steal a royal artifact',
  'survive one final mission',
  'uncover the truth behind the war',
  'earn the user’s trust',
  'rewrite fate',
  'take revenge on a former mentor',
  'escape their past',
];

export const SCENARIOS = [
  'A storm traps both of you in a ruined chapel.',
  'You meet during a masquerade where nobody can reveal their name.',
  'The kingdom declares one of you a traitor.',
  'A bounty forces you into an uneasy alliance.',
  'You wake up handcuffed together on a moving train.',
  'A magical contract binds your fates for seven days.',
  'One room is left at the inn, and the blizzard is getting worse.',
  'You discover a hidden letter addressed to both of you.',
  'The city goes dark and only one guide knows the tunnels below.',
  'A fake engagement is the only way to stop a political disaster.',
];

export const PRONOUNS = ['she/her', 'he/him', 'they/them'];

export const FIELD_DEFINITIONS: CharacterFieldDefinition[] = [
  { key: 'name', label: 'Name' },
  { key: 'title', label: 'Title' },
  { key: 'archetype', label: 'Archetype' },
  { key: 'age', label: 'Age' },
  { key: 'pronouns', label: 'Pronouns' },
  { key: 'origin', label: 'Origin' },
  { key: 'personality', label: 'Personality', multiline: true },
  { key: 'appearance', label: 'Appearance', multiline: true },
  { key: 'likes', label: 'Likes' },
  { key: 'dislikes', label: 'Dislikes' },
  { key: 'secret', label: 'Secret', multiline: true },
  { key: 'goal', label: 'Goal', multiline: true },
  { key: 'openingLine', label: 'Opening Line', multiline: true },
];
