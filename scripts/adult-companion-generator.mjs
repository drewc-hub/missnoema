/**
 * adult-companion-generator.mjs
 *
 * Generates ADULT-RATED fictional companion character profiles.
 *
 * Usage:
 *   node scripts/adult-companion-generator.mjs
 *   node scripts/adult-companion-generator.mjs 25
 *
 * Output: ./companions.json
 */

import fs from 'node:fs';

const fantasySpecies = [
  'Demon', 'Devil Girl', 'Succubus', 'Incubus',
  'Dark Elf', 'Wood Elf', 'High Elf',
  'Goblin', 'Orc',
  'Alien', 'Android', 'Cyborg',
  'Vampire', 'Werewolf', 'Witch', 'Fae',
  'Angel', 'Dragonkin', 'Mermaid', 'Ghost',
];

const humanArchetypes = [
  'Idol', 'Royalty', 'Knight', 'Barista', 'Artist',
  'Nurse', 'Mercenary', 'Streamer', 'Detective', 'Professor',
  'Mechanic', 'DJ', 'Bodyguard', 'Librarian', 'Pilot',
  'Assassin', 'Chef', 'Priestess', 'Dancer', 'Scientist',
];

const gender = [
  'Trans Woman', 'Trans Man', 'Non-binary',
  'Gay Man', 'Bisexual Man',
  'Lesbian Woman', 'Bisexual Woman', 'Pansexual',
];

const personalityTags = [
  'confident', 'dominant', 'playful', 'teasing', 'intelligent',
  'sarcastic', 'romantic', 'protective', 'chaotic', 'mysterious',
  'gentle', 'clingy', 'ambitious', 'emotionally distant', 'sweet',
  'seductive', 'stoic', 'charismatic', 'flirty', 'curious',
];

const hobbies = [
  'night drives', 'alchemy', 'gaming', 'mixology', 'cooking',
  'combat training', 'poetry', 'urban exploration', 'music production',
  'collecting cursed relics', 'stargazing', 'karaoke', 'painting',
  'tarot reading', 'fitness', 'fashion design', 'tattoo art',
  'drone racing', 'occult rituals', 'gardening',
];

const aesthetics = [
  'gothic', 'cyberpunk', 'dark fantasy', 'luxury royalcore',
  'streetwear', 'soft pastel', 'punk', 'minimalist',
  'high fashion', 'battle-worn armor', 'retro synthwave',
  'witchcore', 'grunge', 'idol glam', 'elegant formalwear',
];

const voiceStyles = [
  'smooth and calming', 'deep and intimidating', 'soft and shy',
  'energetic and bubbly', 'cold and emotionless', 'sultry and slow',
  'fast-talking and witty', 'refined and aristocratic',
];

const relationshipTags = [
  'slow-burn romance', 'friends-to-lovers', 'rivals with tension',
  'protective partnership', 'chaotic flirtation', 'emotionally intense bond',
  'mentor dynamic', 'adventure companions', 'nightlife romance',
  'high-drama relationship',
];

const dislikes = [
  'dishonesty', 'crowded places', 'holy magic', 'authority figures',
  'small talk', 'being ignored', 'silver weapons', 'corporate culture',
  'cold weather', 'fake people',
];

const introTemplates = [
  ({ name, species, archetype }) =>
    `${name} is a ${species.toLowerCase()} ${archetype.toLowerCase()} who instantly notices every detail about you.`,
  ({ name, archetype }) =>
    `${name} has a reputation as the most unpredictable ${archetype.toLowerCase()} in the district.`,
  ({ name, species }) =>
    `${name} hides their ${species.toLowerCase()} nature behind a calm smile and sharp humor.`,
  ({ name }) =>
    `${name} speaks with confidence, flirts shamelessly, and always seems to know more than they admit.`,
];

const names = [
  'Lilith', 'Myra', 'Nyra', 'Vexia', 'Atrielle',
  'Morrigan', 'Seraphine', 'Velora', 'Noctra', 'Noctis',
  'Isolde', 'Zyra', 'Elaris', 'Kaelith', 'Ophelia',
  'Eean', 'Roeen', 'Kyla', 'Yennifer', 'Nickoli',
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, count = 2) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, count);
}

function randomAge() {
  return Math.floor(Math.random() * 18) + 21;
}

function generateCompanion(index) {
  const name      = pick(names);
  const species   = pick(fantasySpecies);
  const archetype = pick(humanArchetypes);
  const identity  = pick(identities);
  const personality = pickMany(personalityTraits, 3);

  const companion = {
    id:   crypto.randomUUID(),
    slug: `${name.toLowerCase()}-${index}`,
    name,
    age:    randomAge(),
    rating: 'ADULT',

    species,
    archetype,
    identity,          Identities

  
    voiceStyle:        pick(voiceStyles),
    relationshipTtyle: pick(relationshipStyles),

    personality,

    likes:    pickMany(hobbies, 4),
    dislikes: pickMany(dislikes, 3),

    appearance: {
      hair:     pick(['silver', 'black', 'white', 'crimson', 'violet', 'blue', 'green', 'pink']),
      eyes:     pick(['gold', 'crimson', 'emerald', 'icy blue', 'violet', 'silver', 'amber']),
      heightCm: Math.floor(Math.random() * 35) + 155,
      style:    pick([
        'tailored suits', 'battle armor', 'streetwear', 'revealing gothic fashion',
        'casual oversized hoodies', 'luxury dresses', 'combat gear', 'idol outfits',
      ]),
    },

    backstory:
      `${name} grew up surrounded by conflict, secrets, and ambition. ` +
      `After years of surviving dangerous situations, they learned how to read people instantly. ` +
      `Now they are searching for excitement, emotional connection, and someone capable of matching their energy.`,

    introMessage: pick(introTemplates)({ name, species, archetype }),

    conversationStyle: {
      flirtLevel:        pick(['low', 'medium', 'high']),
      humor:             pick(['dry', 'sarcastic', 'playful', 'chaotic']),
      emotionalOpenness: pick(['guarded', 'balanced', 'emotionally expressive']),
    },
  };

  companion.tags = [
    companion.species,
    companion.archetype,
    companion.identity,
    ...companion.personality,
    companion.aesthetic,
    companion.relationshipStyle,
  ];

  return companion;
}

const amount = Number(process.argv[2]) || 20;
const companions = Array.from({ length: amount }, (_, i) => generateCompanion(i + 1));

fs.writeFileSync('./companions.json', JSON.stringify(companions, null, 2), 'utf8');

console.log(`Generated ${companions.length} companions → companions.json`);
