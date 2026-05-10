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
  return faker.helpers.shuffle([...arr]).slice(0, count);
}

function generateName(gender) {
  if (gender === "Male") return faker.person.firstName("male");
  if (gender === "Female") return faker.person.firstName("female");
  return faker.person.firstName();
}

function generateSlug(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base}-${suffix}`;
}

function generateBio(name, age, race, era, personalityTags, occupation) {
  return `${name} is a ${age}-year-old ${race} from the ${era} era. A ${personalityTags[0].toLowerCase()} and ${personalityTags[1].toLowerCase()} ${occupation.toLowerCase()}, known for ${faker.word.adjective()} magic, dangerous secrets, and intense companionship.`;
}

function buildAvatarPrompt(gender, race, occupation, era, aestheticTags) {
  return `${gender}, ${race}, ${occupation}, ${era}, ${aestheticTags.join(", ")}, ${randomItem(avatarStyles)}, high detail, cinematic lighting`;
}

/* ----------------------------------------------------------
 * GENERATE COMPANION
 * ---------------------------------------------------------- */

function generateCompanion() {
  const gender = randomItem(genders);
  const race = randomItem(races);
  const era = randomItem(eras);
  const occupation = randomItem(occupations);

  const personality = randomItems(personalityTags, 4, 8);
  const kinks = randomItems(kinkTags, 2, 6);
  const aesthetics = randomItems(aestheticTags, 2, 5);
  const relationships = randomItems(relationshipTags, 2, 5);

  const name = generateName(gender);
  const age = faker.number.int({ min: 18, max: 400 });

  const bio = generateBio(name, age, race, era, personality, occupation);
  const avatarPrompt = buildAvatarPrompt(gender, race, occupation, era, aesthetics);

  const scenario = faker.helpers.arrayElement([
    "A cursed kingdom on the brink of war.",
    "A haunted castle hidden in the mountains.",
    "A bustling Victorian city full of secrets.",
    "A distant alien colony on a dying planet.",
    "A magical academy where forbidden magic thrives.",
  ]);

  return {
    name,
    slug: generateSlug(name),
    description: `${race} ${occupation} from the ${era} era`,
    gender,
    race,
    era,
    age,
    bio,
    greeting: `Greetings traveler... I am ${name}, the ${race.toLowerCase()} ${occupation.toLowerCase()} you've been searching for.`,
    scenario,
    tags: [...new Set([race, occupation, ...aesthetics.slice(0, 2)])],
    personalityTags: personality,
    kinkTags: kinks,
    relationshipTags: relationships,
    aestheticTags: aesthetics,
    nsfw: true,
    public: true,
    visibility: "PUBLIC",
    contentRating: "ADULT",
    profile: {
      scene: scenario,
      background: `${era} world — ${avatarPrompt}`,
      personality: personality.join(", "),
      wardrobe: `${aesthetics[0]} inspired attire`,
      traits: personality,
      voice: null,
      sliders: {
        warmth: faker.number.int({ min: 20, max: 90 }),
        humor: faker.number.int({ min: 10, max: 80 }),
        flirtiness: faker.number.int({ min: 20, max: 90 }),
        dominance: faker.number.int({ min: 10, max: 90 }),
      },
      boundaries: [],
    },
  };
}

/* ----------------------------------------------------------
 * MAIN
 * ---------------------------------------------------------- */

async function main() {
  console.log(`🌙 Seeding ${PROFILE_COUNT} companion profiles...`);

  let created = 0;
  let failed = 0;

  for (let i = 0; i < PROFILE_COUNT; i++) {
    try {
      await prisma.companion.create({ data: generateCompanion() });
      created++;
      if (created % 50 === 0) console.log(`  ${created} created...`);
    } catch (e) {
      failed++;
      console.error(`  ✗ Failed:`, e.message.split("\n")[0]);
    }
  }

  console.log(`\n✅ Done — ${created} created, ${failed} failed`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
