/**
 * seed-companions.mjs
 *
 * Usage:
 *   node prisma/seed-companions.mjs
 *
 * Requirements:
 *   npm i @faker-js/faker
 *
 * Add to package.json:
 *   "prisma": {
 *     "seed": "node prisma/seed-companions.mjs"
 *   }
 */

import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

/* ----------------------------------------------------------
 * CONFIG
 * ---------------------------------------------------------- */

const PROFILE_COUNT = 500;

const genders = [
  "Female",
  "Gay",
  "Trans",
  "Bisexual",
  "Lesbian",
  "Male",
  "Non-Binary",
  "Androgynous",
];

const races = [
  "Human",
  "Elf",
  "Dark Elf",
  "High Elf",
  "Wood Elf",
  "Orc",
  "Half-Orc",
  "Goblin",
  "Demon",
  "Succubus",
  "Incubus",
  "Witch",
  "Warlock",
  "Alien",
  "Android",
  "Vampire",
  "Werewolf",
  "Fairy",
  "Dragonkin",
  "Angel",
  "Necromancer",
  "Pirate",
  "Knight",
  "Samurai",
  "Viking",
  "Noble",
  "Peasant",
  "Queen",
  "King",
  "Assassin",
  "Mercenary",
  "Mage",
  "Bard",
  "Priestess",
];

const eras = [
  "1500s Renaissance",
  "1600s Colonial",
  "1700s Enlightenment",
  "1800s Victorian",
  "Steampunk",
  "Dark Fantasy",
  "Medieval",
  "Ancient",
  "Sci-Fi Future",
  "Post-Apocalyptic",
];

const personalityTags = [
  "Dominant",
  "Submissive",
  "Switch",
  "Protective",
  "Possessive",
  "Gentle",
  "Cold",
  "Flirty",
  "Seductive",
  "Intelligent",
  "Mystical",
  "Loyal",
  "Obsessive",
  "Playful",
  "Tsundere",
  "Yandere",
  "Motherly",
  "Stoic",
  "Chaotic",
  "Elegant",
  "Savage",
  "Manipulative",
  "Caring",
  "Romantic",
  "Dark",
  "Innocent",
  "Shy",
  "Confident",
  "Cruel",
  "Protective",
  "Curious",
  "Sarcastic",
];

const relationshipTags = [
  "Romance",
  "Slow Burn",
  "Enemies to Lovers",
  "Forbidden Love",
  "Royalty",
  "Bodyguard",
  "Master Servant",
  "Knight Princess",
  "Monster Lover",
  "Marriage",
  "Adventure",
  "Fantasy Tavern",
  "Court Politics",
  "Dungeon Quest",
  "Space Travel",
  "Witch Coven",
  "Pirate Crew",
];

const kinkTags = [
  "BDSM",
  "Bondage",
  "Dominance",
  "Submission",
  "Praise",
  "Degradation",
  "Roleplay",
  "Power Exchange",
  "Pet Play",
  "Impact Play",
  "Voyeurism",
  "Exhibitionism",
  "Teasing",
  "Edging",
  "Sensory Play",
  "Leather",
  "Collar",
  "Brat",
  "Service",
  "Fantasy Roleplay",
];

const aestheticTags = [
  "Gothic",
  "Victorian",
  "Steampunk",
  "Dark Academia",
  "Royalcore",
  "Cottagecore",
  "Cyberpunk",
  "Arcane",
  "Forest",
  "Celestial",
  "Piratecore",
  "Medieval",
  "Baroque",
  "Occult",
];

const occupations = [
  "Queen",
  "King",
  "Witch",
  "Blacksmith",
  "Mercenary",
  "Pirate Captain",
  "Mage",
  "Assassin",
  "Knight",
  "Bounty Hunter",
  "Innkeeper",
  "Scholar",
  "Necromancer",
  "Alien Diplomat",
  "Oracle",
  "War General",
  "Vampire Noble",
];

const avatarStyles = [
  "realistic fantasy portrait",
  "dark fantasy portrait",
  "anime fantasy portrait",
  "victorian oil painting portrait",
  "cinematic fantasy portrait",
  "steampunk portrait",
];

/* ----------------------------------------------------------
 * HELPERS
 * ---------------------------------------------------------- */

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomItems(arr, min = 2, max = 8) {
  const count = faker.number.int({ min, max });

  return faker.helpers
    .shuffle([...arr])
    .slice(0, count);
}

function generateName(gender) {
  if (gender === "Male") {
    return faker.person.firstName("male");
  }

  if (gender === "Female") {
    return faker.person.firstName("female");
  }

  return faker.person.firstName();
}

function generateBio(profile) {
  return `${profile.name} is a ${profile.age}-year-old ${
    profile.race
  } from the ${profile.era} era. A ${
    profile.personalityTags[0]
  } and ${profile.personalityTags[1].toLowerCase()} ${
    profile.occupation
  }, known for ${faker.word.adjective()} magic, dangerous secrets, and intense companionship.`;
}

function buildAvatarPrompt(profile) {
  return `
${profile.gender},
${profile.race},
${profile.occupation},
${profile.era},
${profile.aestheticTags.join(", ")},
${randomItem(avatarStyles)},
high detail,
cinematic lighting
  `
    .replace(/\s+/g, " ")
    .trim();
}

/* ----------------------------------------------------------
 * GENERATE PROFILE
 * ---------------------------------------------------------- */

function generateProfile() {
  const gender = randomItem(genders);
  const race = randomItem(races);
  const era = randomItem(eras);

  const personality = randomItems(personalityTags, 4, 8);
  const kinks = randomItems(kinkTags, 2, 6);
  const aesthetics = randomItems(aestheticTags, 2, 5);
  const relationships = randomItems(relationshipTags, 2, 5);

  const occupation = randomItem(occupations);

  const name = generateName(gender);

  const age = faker.number.int({
    min: 18,
    max: 400,
  });

  const profile = {
    name,
    gender,
    race,
    era,
    age,
    occupation,
    personalityTags: personality,
    kinkTags: kinks,
    relationshipTags: relationships,
    aestheticTags: aesthetics,
  };

  return {
    ...profile,

    title: `${race} ${occupation}`,

    bio: generateBio(profile),

    greeting: `Greetings traveler... I am ${name}, the ${race.toLowerCase()} ${occupation.toLowerCase()} you've been searching for.`,

    scenario: faker.helpers.arrayElement([
      "A cursed kingdom on the brink of war.",
      "A haunted castle hidden in the mountains.",
      "A bustling Victorian city full of secrets.",
      "A distant alien colony on a dying planet.",
      "A magical academy where forbidden magic thrives.",
    ]),

    avatarPrompt: buildAvatarPrompt(profile),

    nsfw: true,

    public: true,

    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/* ----------------------------------------------------------
 * MAIN SEED
 * ---------------------------------------------------------- */

async function main() {
  console.log("🌙 Generating AI companion profiles...");

  const profiles = Array.from(
    { length: PROFILE_COUNT },
    generateProfile
  );

  for (const profile of profiles) {
    await prisma.companion.create({
      data: profile,
    });
  }

  console.log(`✅ Seeded ${PROFILE_COUNT} companion profiles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

