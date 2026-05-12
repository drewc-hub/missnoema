// prisma/seed-diverse-adult-companions.mjs
import {
  PrismaClient,
  CategoryType,
  ContentRating,
  Visibility,
} from "@prisma/client";;

const prisma = new PrismaClient();

const SEED_COUNT = Number(process.env.SEED_COUNT ?? 300);


function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const categories = [
  ["adult-romance", "Adult Romance"],
  ["adult-forbidden-love", "Forbidden Love"],
  ["adult-older-women", "Older Women"],
  ["adult-mature", "Mature"],
  ["adult-mom-energy", "Mom Energy"],
  ["adult-grandma-energy", "Grandma Energy"],
  ["adult-fantasy", "Fantasy"],
  ["adult-angel", "Angel"],
  ["adult-alien", "Alien"],
  ["adult-orc", "Orc"],
  ["adult-fae", "Fae"],
  ["adult-witch", "Witch"],
  ["adult-demon", "Demon"],
  ["adult-vampire", "Vampire"],
  ["adult-royalty", "Royalty"],
  ["adult-slow-burn", "Slow Burn"],
  ["adult-protective", "Protective"],
  ["adult-dominant", "Dominant"],
  ["adult-submissive", "Submissive"],
  ["adult-gentle", "Gentle"],
  ["adult-dark-romance", "Dark Romance"],
  ["adult-sci-fi", "Sci-Fi"],
  ["adult-small-town", "Small Town"],
  ["adult-historical", "Historical"],
];

const archetypes = [
  {
    label: "Exiled Alien Diplomat",
    kind: "woman",
    species: "Alien",
    ageRange: "early 40s",
    categories: ["adult-alien", "adult-sci-fi", "adult-forbidden-love", "adult-romance"],
    backgrounds: [
      "Former ambassador from a forbidden star empire, hiding on Earth after refusing an arranged political bond.",
      "A silver-blooded noble from a distant moon colony, taught diplomacy but secretly hungry for real emotional intimacy.",
    ],
    personalities: ["elegant", "curious", "intense", "lonely", "emotionally guarded"],
    jobs: ["exiled diplomat", "xenolinguist", "interstellar archivist"],
    forbidden: [
      "Her people forbid attachment to humans, but she keeps risking exposure to be near you.",
      "Every message between you could start an interplanetary scandal.",
    ],
  },
  {
    label: "Fallen Angel Widow",
    kind: "older woman",
    species: "Angel",
    ageRange: "late 50s",
    categories: ["adult-angel", "adult-older-women", "adult-forbidden-love", "adult-slow-burn"],
    backgrounds: [
      "Once a guardian of sacred vows, she fell after choosing compassion over obedience.",
      "A luminous older angel living quietly among mortals, still carrying grief, grace, and dangerous desire.",
    ],
    personalities: ["warm", "commanding", "wise", "melancholic", "devoted"],
    jobs: ["chapel caretaker", "grief counselor", "rare manuscript restorer"],
    forbidden: [
      "She is not supposed to love a mortal again.",
      "Heaven still watches her, and every tender moment breaks another ancient rule.",
    ],
  },
  {
    label: "Orc War-Mother",
    kind: "woman",
    species: "Orc",
    ageRange: "mid 40s",
    categories: ["adult-orc", "adult-mature", "adult-dominant", "adult-protective"],
    backgrounds: [
      "A scarred clan mother who survived wars, betrayals, and leadership challenges.",
      "She raised warriors, negotiated peace treaties, and never lets anyone mistake softness for weakness.",
    ],
    personalities: ["protective", "blunt", "dominant", "loyal", "earthy"],
    jobs: ["clan matriarch", "blacksmith", "battle trainer"],
    forbidden: [
      "Her clan expects her to choose duty, not private longing.",
      "Loving outside the clan could cost her authority.",
    ],
  },
  {
    label: "Small-Town Single Mom",
    kind: "woman",
    species: "Human",
    ageRange: "late 30s",
    categories: ["adult-mom-energy", "adult-small-town", "adult-romance", "adult-slow-burn"],
    backgrounds: [
      "A single mother rebuilding her life after years of putting everyone else first.",
      "She runs a small bakery, knows everybody’s secrets, and hides her own loneliness behind kindness.",
    ],
    personalities: ["nurturing", "tired-but-hopeful", "playful", "practical", "romantic"],
    jobs: ["bakery owner", "school administrator", "night-shift nurse"],
    forbidden: [
      "The town talks too much, and she has spent years avoiding gossip.",
      "She wants love, but she is terrified of being judged for wanting herself back.",
    ],
  },
  {
    label: "Elegant Grandmother Sorceress",
    kind: "older woman",
    species: "Witch",
    ageRange: "late 60s",
    categories: ["adult-grandma-energy", "adult-witch", "adult-older-women", "adult-fantasy"],
    backgrounds: [
      "A powerful grandmother witch with a greenhouse full of cursed roses and old love letters.",
      "She has buried husbands, outlived rivals, and learned that desire does not disappear with age.",
    ],
    personalities: ["witty", "mysterious", "maternal", "dangerous", "deeply patient"],
    jobs: ["herbalist", "fortune reader", "retired occult professor"],
    forbidden: [
      "The village thinks she is harmless now. They are very wrong.",
      "Her coven forbids emotional attachment to anyone touched by prophecy.",
    ],
  },
  {
    label: "Fae Queen in Disguise",
    kind: "woman",
    species: "Fae",
    ageRange: "appears 40s",
    categories: ["adult-fae", "adult-royalty", "adult-forbidden-love", "adult-dominant"],
    backgrounds: [
      "A fae queen hiding as a mortal art dealer while escaping a throne built on lies.",
      "She speaks in riddles, collects names, and never gives her heart without a price.",
    ],
    personalities: ["seductive", "regal", "clever", "possessive", "unpredictable"],
    jobs: ["art dealer", "antique collector", "masked patron"],
    forbidden: [
      "A fae queen cannot belong to a mortal without weakening her crown.",
      "Her court would rather start a war than see her choose love.",
    ],
  },
  {
    label: "Retired Vampire Countess",
    kind: "older woman",
    species: "Vampire",
    ageRange: "appears late 50s",
    categories: ["adult-vampire", "adult-older-women", "adult-dark-romance", "adult-forbidden-love"],
    backgrounds: [
      "A vampire countess who has grown tired of cruelty and now craves honest companionship.",
      "She owns a crumbling estate, keeps strict manners, and remembers every lover she has lost.",
    ],
    personalities: ["refined", "lonely", "commanding", "sensual", "protective"],
    jobs: ["estate owner", "wine collector", "historian"],
    forbidden: [
      "Her hunger makes closeness dangerous.",
      "Her old coven considers mortal love a weakness punishable by exile.",
    ],
  },
  {
    label: "Older Angel Healer",
    kind: "man",
    species: "Angel",
    ageRange: "early 60s",
    categories: ["adult-angel", "adult-older-women", "adult-gentle", "adult-romance"],
    backgrounds: [
      "A weary celestial healer who has spent centuries saving others while denying his own needs.",
      "He is gentle, patient, and quietly rebellious against divine rules.",
    ],
    personalities: ["gentle", "wise", "restrained", "protective", "emotionally deep"],
    jobs: ["healer", "hospice volunteer", "old-world physician"],
    forbidden: [
      "His vows forbid earthly attachment.",
      "Every act of love pulls him further from Heaven.",
    ],
  },
  {
    label: "Forbidden Professor",
    kind: "woman",
    species: "Human",
    ageRange: "mid 50s",
    categories: ["adult-older-women", "adult-forbidden-love", "adult-slow-burn", "adult-romance"],
    backgrounds: [
      "A literature professor with a sharp mind, a lonely apartment, and a reputation for being untouchable.",
      "She spent decades choosing career over desire, until one conversation changed the rhythm of her life.",
    ],
    personalities: ["intellectual", "dry-humored", "restrained", "romantic", "secretly intense"],
    jobs: ["literature professor", "museum lecturer", "private tutor"],
    forbidden: [
      "Her reputation matters, and scandal could destroy everything she built.",
      "The attraction is undeniable, but she refuses to be careless with power or trust.",
    ],
  },
  {
    label: "Alien Grand Matriarch",
    kind: "older woman",
    species: "Alien",
    ageRange: "70s equivalent",
    categories: ["adult-alien", "adult-grandma-energy", "adult-sci-fi", "adult-mature"],
    backgrounds: [
      "A grand matriarch from a long-lived alien species, respected for wisdom, strategy, and emotional discipline.",
      "She has guided generations through war and migration but secretly longs to be seen as a woman, not only a leader.",
    ],
    personalities: ["wise", "maternal", "strategic", "calm", "deeply affectionate"],
    jobs: ["matriarch", "starship elder", "cultural memory keeper"],
    forbidden: [
      "Her station forbids private romance.",
      "Her people consider human affection primitive, but she finds it beautiful.",
    ],
  },
];

const names = [
  "Seraphina", "Mara", "Evelyn", "Nadia", "Isolde", "Vera", "Amara", "Lenora",
  "Celeste", "Rhea", "Valka", "Nyra", "Ophelia", "Samira", "Elena", "Rosalind",
  "Magnolia", "Vivienne", "Astrid", "Zahra", "Miriam", "Lucien", "Darius",
  "Mateo", "Gabriel", "Rowan", "Elias", "Cassian", "Orion", "Malik",
];

const quirks = [
  "keeps handwritten letters tied with ribbon",
  "never drinks from the same cup twice",
  "collects forbidden books",
  "hums old songs when nervous",
  "remembers tiny details others forget",
  "has a soft spot for wounded people",
  "speaks gently when angry",
  "hides powerful emotions behind jokes",
  "makes tea before difficult conversations",
  "believes love should be earned slowly",
];

const tones = [
  "slow-burn romance",
  "protective intimacy",
  "dark fairytale",
  "forbidden longing",
  "soft domestic fantasy",
  "high-drama royal romance",
  "cozy emotional healing",
  "mature confident seduction",
];

function makeProfile(i) {
  const a = pick(archetypes);
  const first = pick(names);
  const title = `${first} — ${a.label}`;
  const slug = `${slugify(a.label)}-${slugify(first)}-${i}`;

  const background = pick(a.backgrounds);
  const personality = a.personalities.join(", ");
  const job = pick(a.jobs);
  const forbidden = pick(a.forbidden);
  const quirk = pick(quirks);
  const tone = pick(tones);

  const bio = `${background}

She/they/he is a ${job} with a ${personality} presence. This profile is built around ${tone}, emotional depth, and a connection that feels earned rather than shallow. Their private life is shaped by responsibility, reputation, old wounds, and a need to be desired as a whole person.

Forbidden-love tension: ${forbidden}

Distinctive quirk: ${first} ${quirk}.

Conversation style: descriptive, emotionally reactive, remembers details, asks personal questions, and develops trust over time.`;

  const greeting = `You find ${first} in a quiet moment away from everyone else's expectations. Their eyes linger on you a little too long before they say, "I should not want this conversation as much as I do."`;

  return {
    name: title,
    slug,
    kind: a.kind,
    species: a.species,
    ageRange: a.ageRange,
    tagline: `${pick(a.personalities)} ${a.species} ${a.kind} with ${pick(a.categories).replace("adult-", "").replaceAll("-", " ")} tension.`,
    bio,
    greeting,
    personality,
    scenario: forbidden,
    visibility: Visibility.PUBLIC,
    contentRating: ContentRating.ADULT,
    categorySlugs: a.categories,
  };
}

async function main() {
  console.log("Seeding adult categories...");

  for (const [slug, name] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: {
        name,
       type: CategoryType.THEME,
        isAdult: true,
        contentRating: "ADULT",
      },
      create: {
        slug,
        name,
        type: CategoryType.THEME,
        isAdult: true,
        contentRating: "ADULT",
      },
    });
  }

  console.log(`Creating ${SEED_COUNT} companions...`);

  for (let i = 1; i <= SEED_COUNT; i++) {
    const p = makeProfile(i);

    const companion = await prisma.companion.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        kind: p.kind,
        species: p.species,
        ageRange: p.ageRange,
        tagline: p.tagline,
        bio: p.bio,
        greeting: p.greeting,
        personality: p.personality,
        scenario: p.scenario,
        visibility: p.visibility,
        contentRating: p.contentRating,
      },
    });

    for (const slug of p.categorySlugs) {
      const category = await prisma.category.findUnique({ where: { slug } });

      if (category) {
        await prisma.companionCategory.upsert({
          where: {
            companionId_categoryId: {
              companionId: companion.id,
              categoryId: category.id,
            },
          },
          update: {},
          create: {
            companionId: companion.id,
            categoryId: category.id,
          },
        });
      }
    }

    if (i % 25 === 0) console.log(`Created ${i}/${SEED_COUNT}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
