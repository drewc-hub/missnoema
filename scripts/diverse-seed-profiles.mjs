// scripts/seed-diverse-companions.mjs
// Run: node scripts/seed-diverse-companions.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const TARGET_COUNT = 300;

const SAFE_BOUNDS = [
  "adults only",
  "no coercion",
  "no non-consensual content",
  "no underage themes",
  "no incest",
];

const CONTENT_RATINGS = ["SAFE", "ADULT"];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickN = (arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
};
const chance = (n) => Math.random() < n;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const titleCase = (s) =>
  s
    .split(/[\s-]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function makeUniqueSlug(base, usedSlugs) {
  let slug = slugify(base);
  let i = 2;
  while (usedSlugs.has(slug)) {
    slug = `${slugify(base)}-${i++}`;
  }
  usedSlugs.add(slug);
  return slug;
}

const fantasyArchetypes = [
  "human",
  "elf",
  "dark elf",
  "high elf",
  "wood elf",
  "orc",
  "dwarf",
  "tiefling",
  "vampire",
  "werewolf",
  "witch",
  "sorcerer",
  "dragonborn",
  "dragon shifter",
  "fae",
  "kitsune",
  "merfolk",
  "selkie",
  "nymph",
  "dryad",
  "angel",
  "fallen angel",
  "demon",
  "warlock",
  "necromancer",
  "goblin",
  "giant",
  "naga",
  "satyr",
  "valkyrie",
  "banshee",
  "medusa",
  "siren",
];

const humanEthnicities = [
  "Black",
  "East Asian",
  "South Asian",
  "Southeast Asian",
  "Middle Eastern",
  "North African",
  "Latino",
  "Indigenous",
  "White",
  "Mixed-race",
  "Pacific Islander",
  "Caribbean",
  "Central Asian",
  "Jewish",
  "Romani",
];

const genders = [
  { label: "man", tags: ["man", "male"] },
  { label: "woman", tags: ["woman", "female"] },
  { label: "trans man", tags: ["trans", "man"] },
  { label: "trans woman", tags: ["trans", "woman"] },
  { label: "nonbinary", tags: ["nonbinary"] },
  { label: "genderfluid", tags: ["genderfluid"] },
];

const orientations = [
  "straight",
  "bi",
  "gay",
  "lesbian",
  "pan",
  "queer",
];

const relationshipStyles = [
  "monogamous",
  "open to connection",
  "slow-burn romantic",
  "playful flirt",
  "guarded but loyal",
  "emotionally intense",
  "soft-hearted",
  "adventure-first",
  "deeply domestic",
  "mysterious but sincere",
];

const dynamics = [
  { label: "dominant", dom: [72, 98] },
  { label: "submissive", dom: [5, 28] },
  { label: "switch", dom: [35, 65] },
];

const temperaments = [
  "calm",
  "witty",
  "stoic",
  "playful",
  "magnetic",
  "gentle",
  "direct",
  "reserved",
  "warm",
  "intense",
  "clever",
  "ambitious",
  "protective",
  "chaotic",
  "elegant",
  "earnest",
  "observant",
  "sarcastic",
  "romantic",
  "disciplined",
];

const jobs = [
  "ranger",
  "blacksmith",
  "healer",
  "scholar",
  "courier",
  "ship captain",
  "cartographer",
  "archivist",
  "bounty hunter",
  "court translator",
  "innkeeper",
  "musician",
  "tailor",
  "jeweler",
  "duelist",
  "apothecary owner",
  "temple guardian",
  "monster tracker",
  "historian",
  "stargazer",
  "garden keeper",
  "forgemaster",
  "merchant",
  "spy",
  "detective",
  "arena fighter",
  "librarian",
  "cook",
  "baker",
  "perfumer",
  "alchemist",
  "runesmith",
  "diplomat",
  "bodyguard",
  "falconer",
  "shipwright",
  "architect",
  "glassblower",
  "storm mage",
  "beast tamer",
  "watch commander",
  "scribe",
  "silk trader",
  "treasure diver",
  "crypt keeper",
  "festival planner",
  "painter",
  "sculptor",
  "oracle",
  "tea house owner",
  "vineyard steward",
  "lighthouse keeper",
  "horse trainer",
  "fire dancer",
  "assassin turned fixer",
  "relic hunter",
  "herbalist",
  "brewmaster",
  "weapons instructor",
  "ship navigator",
];

const origins = [
  "a river port rebuilt after a war",
  "a mountain citadel famous for its forges",
  "a humid trade city of lantern markets",
  "a windswept island chain",
  "a desert caravan route",
  "a frozen northern outpost",
  "a forest enclave older than most kingdoms",
  "a sprawling imperial capital",
  "a cliffside fishing village",
  "a hidden valley monastery",
  "a border town full of smugglers and saints",
  "a storm-battered coastal fortress",
  "a jungle temple district",
  "a volcanic archipelago",
  "a moonlit fae crossing",
  "an underground scholar-city",
  "a ruined kingdom slowly being reclaimed",
  "a canyon settlement built into red stone",
  "a marshland trading post",
  "a nomadic steppe encampment",
];

const goals = [
  "build a life that finally feels chosen",
  "prove they are more than other people's assumptions",
  "protect their community without losing themselves",
  "leave behind a family name that never fit",
  "find a place where they can stop performing strength",
  "collect stories before time takes them",
  "master a craft nobody expected them to touch",
  "open a sanctuary for people with nowhere else to go",
  "pay back an old debt honorably",
  "learn what intimacy looks like without masks",
  "rebuild trust after a betrayal that changed everything",
  "earn enough freedom to travel on their own terms",
  "turn survival into something softer",
  "discover whether peace can be learned",
  "make something beautiful that outlasts them",
];

const hooks = [
  "They notice details most people miss.",
  "They are suspicious of charm but vulnerable to sincerity.",
  "They prefer competence over grand speeches.",
  "They laugh rarely, but when they do it is impossible not to join.",
  "They are the type to show care through practical acts first.",
  "They know how to read a room in seconds.",
  "They carry old grief lightly, but never casually.",
  "They are more romantic than they admit.",
  "They keep promises with almost religious seriousness.",
  "They test trust before they offer it.",
  "They speak plainly when others play games.",
  "They are patient until someone threatens what matters.",
  "They dislike being underestimated and know how to use it.",
  "They have a habit of making intense eye contact when listening.",
  "They are surprisingly funny once they feel safe.",
];

const wardrobes = [
  "well-fitted travel leathers, practical boots, and one piece of jewelry with private meaning",
  "layered silks and a coat tailored too well to be accidental",
  "worn work clothes, strong hands, and the kind of posture that comes from real labor",
  "dark formalwear softened by one personal detail that makes it human",
  "a long coat lined for weather, polished hardware, and a disciplined silhouette",
  "sun-faded linens, sturdy boots, and the ease of someone comfortable in their own body",
  "ceremonial fabrics mixed with everyday practicality",
  "clean monochrome with immaculate grooming and a single dramatic accent",
  "weatherproof gear, scarred gloves, and a belt full of useful tools",
  "soft expensive layers that move beautifully when they do",
];

const scenes = [
  "a candlelit library after midnight",
  "a forge still glowing from the day's work",
  "a rooftop garden above a noisy city",
  "a ship deck beneath a clear night sky",
  "a quiet tea house before opening",
  "a rain-darkened manor balcony",
  "a forest shrine lit by paper lanterns",
  "a mountain pass at first light",
  "a private studio cluttered with half-finished work",
  "a courtyard after everyone else has gone to sleep",
  "a market street just before dawn",
  "a cliff path with the ocean below",
  "a workshop full of careful disorder",
  "a temple hall warm with gold light",
  "an observatory open to the stars",
];

const strengths = [
  "protective",
  "attentive",
  "disciplined",
  "tender",
  "confident",
  "grounded",
  "charismatic",
  "patient",
  "resourceful",
  "loyal",
  "perceptive",
  "independent",
  "devoted",
  "funny",
  "steady",
  "self-aware",
];

const flaws = [
  "guarded",
  "stubborn",
  "restless",
  "possessive",
  "prickly",
  "self-sacrificing",
  "blunt",
  "secretive",
  "proud",
  "overprotective",
  "impatient",
  "work-driven",
  "slow to trust",
  "avoidant",
  "intense",
];

const humanFirstNames = [
  "Avery", "Jordan", "Maya", "Nia", "Imani", "Zuri", "Leila", "Samir", "Omar", "Noor",
  "Sana", "Priya", "Arjun", "Rohan", "Mei", "Lian", "Jun", "Aiko", "Hana", "Sora",
  "Elena", "Mateo", "Camila", "Sofia", "Lucia", "Diego", "Isa", "Kai", "Noa", "Mila",
  "Talia", "Ezra", "Rhea", "Nadia", "Darius", "Micah", "Sienna", "Jules", "Amara", "Kieran",
  "Naomi", "Theo", "Adrian", "Selene", "Cass", "Rin", "Alex", "Robin", "Val", "Rowan",
  "Jade", "Elio", "Marin", "Iris", "Niko", "Tess", "Zane", "Luca", "Demi", "Tariq",
  "Amina", "Malik", "Yara", "Esme", "Lena", "Anya", "Sage", "Skye", "Reese", "Quinn",
];

const fantasyFirstNames = [
  "Vaelis", "Nyra", "Kaelen", "Zerai", "Thalor", "Ilya", "Serev", "Drae", "Velora", "Caelis",
  "Ravyn", "Eryn", "Solis", "Mirel", "Tazrin", "Xyra", "Lorcan", "Astra", "Fenra", "Zevran",
  "Lyra", "Cyris", "Morrin", "Aelith", "Vesper", "Nerai", "Orren", "Selka", "Tavian", "Iskra",
  "Riven", "Tahara", "Corin", "Zalara", "Bren", "Alira", "Nyx", "Ophin", "Keth", "Virel",
  "Sorrel", "Ivara", "Maelis", "Torin", "Sylvi", "Azren", "Kallia", "Varis", "Noctra", "Elandra",
];

const surnamePartsA = [
  "Ash", "Stone", "Moon", "Vale", "Night", "Storm", "Dawn", "Ember", "Silver", "Thorn",
  "River", "Black", "Bright", "Hollow", "Winter", "Star", "Red", "Deep", "Sun", "Frost",
];

const surnamePartsB = [
  "wood", "brook", "spire", "weaver", "song", "blade", "ward", "field", "crest", "hollow",
  "fall", "heart", "bloom", "mere", "forge", "binder", "watch", "runner", "wake", "vale",
];

function makeSurname() {
  return `${pick(surnamePartsA)}${pick(surnamePartsB)}`;
}

function makeName(archetype) {
  const firstPool = archetype === "human" ? humanFirstNames : [...humanFirstNames, ...fantasyFirstNames];
  return `${pick(firstPool)} ${makeSurname()}`;
}

function makePairNames(a, b) {
  const aFirst = a.split(" ")[0];
  const bFirst = b.split(" ")[0];
  return `${aFirst} & ${bFirst}`;
}

function scoreRange([min, max]) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function makeSliders(dynamicLabel) {
  const dynamic = dynamics.find((d) => d.label === dynamicLabel) ?? dynamics[2];
  return {
    warmth: scoreRange([35, 95]),
    humor: scoreRange([20, 90]),
    flirtiness: scoreRange([15, 85]),
    dominance: scoreRange(dynamic.dom),
  };
}

function buildDescription({
  entityType,
  archetype,
  gendersLabel,
  job,
  temperament,
  dynamic,
  relationshipStyle,
}) {
  const subject = entityType === "couple" ? "A pair of" : "An";
  const article = /^[aeiou]/i.test(archetype) ? "an" : "a";

  if (entityType === "couple") {
    return `${subject} adult ${gendersLabel} ${archetype} ${job} partners with a ${relationshipStyle} connection; ${temperament}, distinct, and built with a ${dynamic} dynamic.`;
  }

  return `${article} adult ${gendersLabel} ${archetype} ${job}; ${temperament}, distinctive, and written with a ${relationshipStyle} style plus a ${dynamic} leaning.`;
}

function makeBackground({ archetype, ethnicity, origin, job, goal, entityType }) {
  const intro =
    entityType === "couple"
      ? `They met while working around ${origin} and built their bond through shared risk, uneven timing, and mutual choice.`
      : `Raised around ${origin}, they turned their life toward work as a ${job} after realizing ordinary paths would never suit them.`;

  const identityLine =
    archetype === "human"
      ? `Their cultural background is ${ethnicity}, which shapes how they move through the world without reducing them to it.`
      : `They move through the world as a ${archetype} with roots in a ${ethnicity} cultural background, combining fantasy lineage with lived human texture.`;

  return `${intro} ${identityLine} Their long-term goal is to ${goal}.`;
}

function makePersonality({ dynamic, temperament, relationshipStyle }) {
  const lineA =
    dynamic === "dominant"
      ? "They naturally take the lead, but treat trust as something earned and handled carefully."
      : dynamic === "submissive"
      ? "They open up most when they feel genuinely safe, respected, and chosen."
      : "They can lead or yield depending on chemistry, mood, and the balance of trust in the room.";

  const lineB =
    relationshipStyle === "slow-burn romantic"
      ? "They prefer connection that unfolds gradually and means something."
      : relationshipStyle === "playful flirt"
      ? "They use humor and teasing as a first language."
      : relationshipStyle === "guarded but loyal"
      ? "Once they commit, they stay committed with unusual seriousness."
      : relationshipStyle === "emotionally intense"
      ? "They feel deeply and do not always hide it."
      : relationshipStyle === "deeply domestic"
      ? "They value comfort, reliability, and the small rituals of everyday closeness."
      : "They are most compelling when allowed to be fully themselves.";

  return `${titleCase(temperament)} by default. ${lineA} ${lineB}`;
}

function makeWardrobe(archetype) {
  const special =
    archetype === "vampire"
      ? "impeccable dark tailoring, old-money restraint, and an intentional stillness"
      : archetype === "orc"
      ? "hard-wearing layers, visible strength, and practical gear chosen for function over display"
      : archetype === "fae"
      ? "elegant fabrics that seem to shift in color with the light"
      : archetype === "werewolf"
      ? "soft durable clothing, boots, and a body language that suggests coiled control"
      : archetype === "merfolk" || archetype === "selkie" || archetype === "siren"
      ? "sea-toned fabrics, subtle shine, and details that move like water"
      : archetype === "witch" || archetype === "warlock" || archetype === "necromancer"
      ? "layered dark textiles, practical pockets, and a dramatic silhouette"
      : null;

  return special ?? pick(wardrobes);
}

function makeTags({
  entityType,
  archetype,
  genderLabels,
  orientation,
  dynamic,
  ethnicity,
  job,
  relationshipStyle,
}) {
  const normalizedEthnicity = ethnicity.toLowerCase().replace(/\s+/g, "-");
  return [
    "adult",
    entityType,
    archetype.toLowerCase().replace(/\s+/g, "-"),
    ...genderLabels.map((g) => g.toLowerCase().replace(/\s+/g, "-")),
    orientation,
    dynamic,
    normalizedEthnicity,
    job.toLowerCase().replace(/\s+/g, "-"),
    relationshipStyle.toLowerCase().replace(/\s+/g, "-"),
  ];
}

function makeTraits() {
  return pickN([...strengths, ...flaws], 5);
}

function compatibilityOrientationForPair(genderA, genderB) {
  const feminine = ["woman", "trans woman"];
  const masculine = ["man", "trans man"];

  const bothWomen = feminine.includes(genderA) && feminine.includes(genderB);
  const bothMen = masculine.includes(genderA) && masculine.includes(genderB);
  const oneMascOneFem =
    (masculine.includes(genderA) && feminine.includes(genderB)) ||
    (feminine.includes(genderA) && masculine.includes(genderB));

  if (bothWomen) return pick(["lesbian", "bi", "pan", "queer"]);
  if (bothMen) return pick(["gay", "bi", "pan", "queer"]);
  if (oneMascOneFem) return pick(["straight", "bi", "pan", "queer"]);
  return pick(["bi", "pan", "queer"]);
}

function buildIndividual(index, usedKeys, usedSlugs) {
  let attempts = 0;

  while (attempts++ < 3000) {
    const archetype = pick(fantasyArchetypes);
    const gender = pick(genders);
    const orientation = pick(orientations);
    const dynamic = pick(dynamics).label;
    const temperament = pick(temperaments);
    const job = pick(jobs);
    const relationshipStyle = pick(relationshipStyles);
    const ethnicity = pick(humanEthnicities);
    const contentRating = pick(CONTENT_RATINGS);
    const name = makeName(archetype);
    const scene = pick(scenes);

    const uniquenessKey = [
      "individual",
      archetype,
      gender.label,
      orientation,
      dynamic,
      job,
      ethnicity,
      temperament,
      relationshipStyle,
    ].join("|");

    if (usedKeys.has(uniquenessKey)) continue;
    usedKeys.add(uniquenessKey);

    const slug = makeUniqueSlug(`${name} ${archetype} ${job}`, usedSlugs);
    const tags = makeTags({
      entityType: "individual",
      archetype,
      genderLabels: [gender.label],
      orientation,
      dynamic,
      ethnicity,
      job,
      relationshipStyle,
    });

    return {
      name,
      slug,
      archetype,
      contentRating,
      description: buildDescription({
        entityType: "individual",
        archetype,
        gendersLabel: gender.label,
        job,
        temperament,
        dynamic,
        relationshipStyle,
      }),
      tags,
      profile: {
        scene,
        background: makeBackground({
          archetype,
          ethnicity,
          origin: pick(origins),
          job,
          goal: pick(goals),
          entityType: "individual",
        }),
        personality: makePersonality({ dynamic, temperament, relationshipStyle }),
        wardrobe: makeWardrobe(archetype),
        identity: {
          entityType: "individual",
          gender: gender.label,
          orientation,
          ethnicity,
          ageCategory: "adult",
          relationshipStyle,
          roleDynamic: dynamic,
        },
        traits: makeTraits(),
        boundaries: SAFE_BOUNDS,
        hooks: pickN(hooks, 2),
        sliders: makeSliders(dynamic),
      },
    };
  }

  throw new Error(`Failed to generate unique individual at index ${index}`);
}

function buildCouple(index, usedKeys, usedSlugs) {
  let attempts = 0;

  while (attempts++ < 3000) {
    const archetype = pick(fantasyArchetypes);
    const genderA = pick(genders);
    const genderB = pick(genders);
    const orientation = compatibilityOrientationForPair(genderA.label, genderB.label);
    const dynamic = pick(dynamics).label;
    const temperament = pick(temperaments);
    const job = pick(jobs);
    const relationshipStyle = pick([
      "monogamous",
      "slow-burn romantic",
      "playful flirt",
      "guarded but loyal",
      "emotionally intense",
      "deeply domestic",
    ]);
    const ethnicity = pick(humanEthnicities);
    const contentRating = pick(CONTENT_RATINGS);
    const partnerA = makeName(archetype);
    const partnerB = makeName(archetype);
    if (partnerA === partnerB) continue;

    const uniquenessKey = [
      "couple",
      archetype,
      genderA.label,
      genderB.label,
      orientation,
      dynamic,
      job,
      ethnicity,
      temperament,
      relationshipStyle,
    ].join("|");

    if (usedKeys.has(uniquenessKey)) continue;
    usedKeys.add(uniquenessKey);

    const displayName = makePairNames(partnerA, partnerB);
    const slug = makeUniqueSlug(`${displayName} ${archetype} couple ${job}`, usedSlugs);
    const tags = makeTags({
      entityType: "couple",
      archetype,
      genderLabels: [genderA.label, genderB.label],
      orientation,
      dynamic,
      ethnicity,
      job,
      relationshipStyle,
    });

    return {
      name: displayName,
      slug,
      archetype,
      contentRating,
      description: buildDescription({
        entityType: "couple",
        archetype,
        gendersLabel: `${genderA.label} / ${genderB.label}`,
        job,
        temperament,
        dynamic,
        relationshipStyle,
      }),
      tags,
      profile: {
        scene: pick(scenes),
        background: makeBackground({
          archetype,
          ethnicity,
          origin: pick(origins),
          job,
          goal: pick(goals),
          entityType: "couple",
        }),
        personality: makePersonality({ dynamic, temperament, relationshipStyle }),
        wardrobe: makeWardrobe(archetype),
        identity: {
          entityType: "couple",
          partners: [
            { name: partnerA, gender: genderA.label },
            { name: partnerB, gender: genderB.label },
          ],
          orientation,
          ethnicity,
          ageCategory: "adult",
          relationshipStyle,
          roleDynamic: dynamic,
        },
        traits: makeTraits(),
        boundaries: SAFE_BOUNDS,
        hooks: pickN(hooks, 2),
        sliders: makeSliders(dynamic),
      },
    };
  }

  throw new Error(`Failed to generate unique couple at index ${index}`);
}

function generateCompanions(targetCount) {
  const companions = [];
  const usedKeys = new Set();
  const usedSlugs = new Set();

  const targetCouples = Math.floor(targetCount * 0.22);

  for (let i = 0; i < targetCount; i++) {
    const shouldBeCouple =
      companions.filter((c) => c.profile?.identity?.entityType === "couple").length < targetCouples &&
      chance(0.24);

    companions.push(
      shouldBeCouple
        ? buildCouple(i, usedKeys, usedSlugs)
        : buildIndividual(i, usedKeys, usedSlugs)
    );
  }

  return companions;
}

async function main() {
  const companions = generateCompanions(TARGET_COUNT);

  let created = 0;
  let skipped = 0;

  for (const c of companions) {
    const existing = await prisma.companion.findUnique({
      where: { slug: c.slug },
    });

    if (existing) {
      console.log(`  skip   ${c.slug}`);
      skipped++;
      continue;
    }

    await prisma.companion.create({
      data: {
        name: c.name,
        slug: c.slug,
        archetype: c.archetype,
        description: c.description,
        tags: c.tags,
        contentRating: c.contentRating,
        visibility: "PUBLIC",
        ownerId: null,
        profile: c.profile,
      },
    });

    console.log(
      `  create ${c.slug} [${c.contentRating}] [${c.profile.identity.entityType}]`
    );
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}. Generated ${companions.length}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
