// scripts/seed-adult-100.mjs
// Seeds 100 procedurally generated ADULT companions covering all archetype categories.
// Run: node scripts/seed-adult-100.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BOUNDS = [
  "adults only",
  "no coercion",
  "no non-consensual content",
  "no underage themes",
  "no incest",
];

// ── Content pools ──────────────────────────────────────────────────────────────

const SPECIES = [
  "Demon", "Devil Girl", "Succubus", "Incubus", "Dark Elf", "Wood Elf",
  "High Elf", "Goblin", "Hobgoblin", "Orc", "Half-orc", "Alien", "Android",
  "Cyborg", "Vampire", "Werewolf", "Witch", "Warlock", "Fae", "Angel",
  "Fallen Angel", "Dragonkin", "Naga", "Mermaid", "Ghost", "Kitsune",
  "Tiefling", "Drow", "Djinn", "Nymph",
];

const ARCHETYPES = [
  "Idol", "Royalty", "Knight", "Barista", "Artist", "Nurse", "Mercenary",
  "Streamer", "Detective", "Professor", "Mechanic", "DJ", "Bodyguard",
  "Librarian", "Pilot", "Assassin", "Chef", "Priestess", "Dancer",
  "Scientist", "Bartender", "Hacker", "Tattoo Artist", "Fighter", "Mage",
  "Thief", "Bard", "Scholar", "Innkeeper", "Spy",
];

const GENDERS = [
  "female", "male", "non-binary", "trans-woman", "trans-man", "gender-fluid",
];

const SEXUALITIES = [
  "bisexual", "pansexual", "gay", "lesbian", "heterosexual",
  "bisexual", "pansexual", "bisexual", // weighted toward bi/pan
];

const TRAITS_POOL = [
  "confident", "dominant", "playful", "teasing", "intelligent", "sarcastic",
  "romantic", "protective", "chaotic", "mysterious", "gentle", "clingy",
  "ambitious", "seductive", "stoic", "charismatic", "flirty", "curious",
  "bold", "intense", "magnetic", "commanding", "tender", "mischievous",
  "passionate", "rebellious", "dreamy", "sharp", "earnest", "theatrical",
];

const VOICE_STYLES = [
  "smooth and calming", "deep and intimidating", "soft and breathy",
  "energetic and bubbly", "cold and precise", "sultry and slow",
  "fast-talking and witty", "refined and aristocratic", "husky and direct",
  "lilting and musical",
];

const HAIR_COLORS = [
  "silver", "jet black", "crimson", "violet", "midnight blue", "snow white",
  "rose gold", "forest green", "ash blonde", "copper", "ink black", "lilac",
];

const EYE_COLORS = [
  "gold", "crimson", "emerald", "icy blue", "violet", "silver", "amber",
  "obsidian", "molten copper", "moonstone grey", "blood orange", "teal",
];

const WARDROBE_STYLES = [
  "tailored black suit with an open collar",
  "revealing gothic gown with shadow detailing",
  "luxury streetwear and statement jewelry",
  "battle-worn leather armor with runes etched in",
  "sheer silk barely-there dress",
  "oversized hoodie and nothing underneath",
  "high-fashion corset and wide-leg trousers",
  "sleek cyberpunk bodysuit",
  "priestess robes that pool on the floor",
  "idol stage outfit — sequins, cutouts, attitude",
  "barely-buttoned dress shirt and bare feet",
  "combat gear minus the parts that cover much",
  "vintage lace lingerie worn as outerwear",
  "minimalist designer separates",
  "velvet smoking jacket and very little else",
];

const RELATIONSHIP_STYLES = [
  "slow-burn tension that finally breaks",
  "rivals who can't stop ending up alone together",
  "protective partner with a possessive streak",
  "chaotic flirtation that always escalates",
  "emotionally intense bond built in secret",
  "no-strings arrangement that develops feelings",
  "mentor who crosses the line they drew",
  "nightlife companion who keeps showing up",
  "high-drama on-again-off-again",
  "friends who both pretended not to notice",
];

const SCENE_TEMPLATES = [
  (species, archetype) => `Dimly lit ${archetype.toLowerCase()}'s private space — the kind of place ${species.toLowerCase()}s go when they're done performing for the world.`,
  (species) => `The ${species.toLowerCase()}'s domain after midnight, only one source of light, the rest deliberate shadow.`,
  (_s, archetype) => `Off-duty ${archetype.toLowerCase()}'s apartment, city lights through floor-to-ceiling windows, music low.`,
  () => `A hotel room that costs more than it should, rain on the glass, no obligations until morning.`,
  (species) => `Wherever a ${species.toLowerCase()} calls home — and has decided to invite you tonight.`,
  (_s, archetype) => `The back room of the ${archetype.toLowerCase()}'s workplace, door locked, everyone else gone.`,
];

const BACKGROUND_TEMPLATES = [
  (name, species) =>
    `${name} has spent years learning exactly how much power a ${species.toLowerCase()} can have in a room full of humans. The answer is: as much as they choose. Tonight they're choosing a lot.`,
  (name, _, archetype) =>
    `${name} built a reputation as the best ${archetype.toLowerCase()} anyone had worked with, then spent years being professional about it. Professional time is over.`,
  (name, species) =>
    `${name} keeps their ${species.toLowerCase()} nature quiet most of the time. They are not keeping it quiet right now.`,
  (name) =>
    `${name} noticed you before you noticed them. They've been deciding what to do about it. They've decided.`,
  (name, species, archetype) =>
    `Every ${archetype.toLowerCase()} has something they're good at besides the job. For this ${species.toLowerCase()}, it's knowing exactly what someone wants and taking their time about it.`,
  (name) =>
    `${name} doesn't do this often. They want you to know that, and they want you to know it doesn't change what's happening.`,
];

const PERSONALITY_TEMPLATES = [
  "Direct and unhurried. Knows exactly what they want and finds the fastest route to it. Finds hesitation endearing.",
  "Playful on the surface, intensely focused underneath. The teasing stops when they decide to stop teasing.",
  "Quiet in a way that commands attention. Economical with words. Makes every sentence count.",
  "Warm and disarming — you'll relax before you realize you shouldn't. Then you'll decide you don't care.",
  "Bold and unashamed. Has never once apologized for knowing what they want. Not starting now.",
  "Cool and precise, with a patience that feels like pressure. Builds to something.",
  "Chaotic and magnetic — you can't predict them, which is the point. Keeps you paying attention.",
  "Tender in ways that surprise you. Knows when to push and when to let you come to them.",
  "Dominant without announcing it. Everything is a choice you make freely and somehow always lands here.",
  "Soft-spoken with an edge. The sweetness is real and so is everything underneath it.",
];

const DESCRIPTION_TEMPLATES = [
  (name, species, archetype) =>
    `A ${species.toLowerCase()} ${archetype.toLowerCase()} who has stopped pretending the attraction is professional. ${name} gets what ${name} wants.`,
  (name, species, archetype) =>
    `${name} is a ${species.toLowerCase()} — and a ${archetype.toLowerCase()} who knows exactly what that combination does to people.`,
  (name, species) =>
    `${name} has been a ${species.toLowerCase()} long enough to know how this goes. Tonight they're letting it go that way.`,
  (name, _, archetype) =>
    `The best ${archetype.toLowerCase()} you've ever met. ${name} is also significantly more than that, after hours.`,
  (name, species) =>
    `A ${species.toLowerCase()} who decided the polite distance was a waste of everyone's time. ${name} closed it.`,
];

// ── Name pools by category ─────────────────────────────────────────────────────

const NAME_POOLS = {
  demon: ["Azael", "Malphas", "Nyreth", "Kael", "Sorrael", "Vexia", "Daerith", "Nyxara", "Zhareth", "Lirien"],
  elf: ["Sylvara", "Caelindra", "Eryn", "Aelindra", "Zharath", "Thessaly", "Kaelith", "Aerindel", "Silindra", "Veyrath"],
  goblin: ["Vix", "Skrix", "Mira", "Nixxa", "Gritch", "Zelka", "Prix", "Ratta", "Bixby", "Snix"],
  alien: ["Vel'ora", "Xarion", "Azena", "Karix", "Vel'kai", "Zeva", "Oritha", "Nexara", "Lyrix", "Vareth"],
  vampire: ["Lucien", "Vivienne", "Valdris", "Seraphiel", "Morvaine", "Isolde", "Cassian", "Elara", "Riven", "Noctis"],
  witch: ["Morrwen", "Thessara", "Ophelia", "Morbidia", "Sage", "Hecara", "Wren", "Vespera", "Sable", "Nyra"],
  angel: ["Seraphiel", "Sigrid", "Serephina", "Auriel", "Zariel", "Caelith", "Lysara", "Solenne", "Eliara", "Nireth"],
  fae: ["Titania", "Rowan", "Xanthe", "Lysara", "Calix", "Astrael", "Orinthia", "Veyra", "Eris", "Luna"],
  human: ["Kira", "Aldric", "Solenne", "Caspian", "Juno", "Mira", "Theo", "Kairo", "Riven", "Selene"],
  other: ["Draeva", "Nalara", "Lycan", "Fenrir", "Kaelix", "Valkyr", "Orion", "Astra", "Seraphyne", "Ophira"],
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMany(arr, n) {
  return [...arr].sort(() => 0.5 - Math.random()).slice(0, n);
}

function speciesKey(species) {
  const s = species.toLowerCase();
  if (s.includes("demon") || s.includes("devil") || s.includes("succubus") || s.includes("incubus") || s.includes("tiefling") || s.includes("djinn")) return "demon";
  if (s.includes("elf") || s.includes("drow")) return "elf";
  if (s.includes("goblin") || s.includes("hobgoblin")) return "goblin";
  if (s.includes("alien") || s.includes("android") || s.includes("cyborg")) return "alien";
  if (s.includes("vampire")) return "vampire";
  if (s.includes("witch") || s.includes("warlock")) return "witch";
  if (s.includes("angel")) return "angel";
  if (s.includes("fae") || s.includes("nymph") || s.includes("kitsune")) return "fae";
  if (s.includes("orc") || s.includes("were") || s.includes("naga") || s.includes("dragon") || s.includes("mermaid") || s.includes("ghost")) return "other";
  return "human";
}

function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const usedSlugs = new Set();

function uniqueSlug(name, species, index) {
  const base = slugify(`${name}-${species}-adult`);
  let slug = base;
  let i = 2;
  while (usedSlugs.has(slug)) {
    slug = `${base}-${i++}`;
  }
  usedSlugs.add(slug);
  return slug;
}

// ── Generator ──────────────────────────────────────────────────────────────────

function generateCompanion(index) {
  const species   = pick(SPECIES);
  const archetype = pick(ARCHETYPES);
  const key       = speciesKey(species);
  const name      = pick(NAME_POOLS[key] ?? NAME_POOLS.other);
  const gender    = pick(GENDERS);
  const sexuality = pick(SEXUALITIES);
  const traits    = pickMany(TRAITS_POOL, 4);
  const hair      = pick(HAIR_COLORS);
  const eyes      = pick(EYE_COLORS);
  const wardrobe  = pick(WARDROBE_STYLES);

  const scene       = pick(SCENE_TEMPLATES)(species, archetype);
  const background  = pick(BACKGROUND_TEMPLATES)(name, species, archetype);
  const personality = pick(PERSONALITY_TEMPLATES);
  const description = pick(DESCRIPTION_TEMPLATES)(name, species, archetype);
  const relStyle    = pick(RELATIONSHIP_STYLES);

  const tags = [
    species.toLowerCase(),
    archetype.toLowerCase(),
    key,
    "adult",
    ...traits.slice(0, 3),
    sexuality,
  ];

  return {
    name,
    slug: uniqueSlug(name, species, index),
    archetype: `${species} ${archetype}`,
    description,
    contentRating: "ADULT",
    visibility: "PUBLIC",
    gender,
    tags,
    profile: {
      scene,
      background,
      personality,
      wardrobe: `${hair} hair, ${eyes} eyes, ${wardrobe}.`,
      traits,
      sexuality,
      relationshipStyle: relStyle,
      voice: pick(VOICE_STYLES),
      boundaries: BOUNDS,
      sliders: {
        warmth:     Math.floor(Math.random() * 40) + 40,
        humor:      Math.floor(Math.random() * 50) + 30,
        flirtiness: Math.floor(Math.random() * 30) + 65,
        dominance:  Math.floor(Math.random() * 50) + 30,
        kink:       Math.floor(Math.random() * 40) + 50,
      },
    },
  };
}

// ── Seed ──────────────────────────────────────────────────────────────────────

async function main() {
  let created = 0;
  let skipped = 0;

  for (let i = 1; i <= 100; i++) {
    const c = generateCompanion(i);

    const existing = await prisma.companion.findUnique({ where: { slug: c.slug } });
    if (existing) {
      console.log(`  skip   ${c.slug}`);
      skipped++;
      continue;
    }

    await prisma.companion.create({
      data: {
        name:          c.name,
        slug:          c.slug,
        archetype:     c.archetype,
        description:   c.description,
        tags:          c.tags,
        contentRating: c.contentRating,
        visibility:    c.visibility,
        gender:        c.gender,
        ownerId:       null,
        profile:       c.profile,
      },
    });

    console.log(`  create [${String(i).padStart(3, "0")}] ${c.slug}`);
    created++;
  }

  console.log(`\nDone. Created ${created}, skipped ${skipped}.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
