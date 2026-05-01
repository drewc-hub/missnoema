// FILE: prisma/seed-companions.ts
import {
  PrismaClient,
  CategoryType,
  ContentRating,
  Visibility,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Run:
 *   pnpm prisma generate
 *   SEED_COUNT_PER_ARCHETYPE=25 SEED_RANDOM="my-seed" pnpm tsx prisma/seed-companions.ts
 *
 * Optional env:
 *   ADULT_VISIBILITY=PRIVATE|PUBLIC        (default PRIVATE)
 *   INCLUDE_ADULT=true|false              (default true)
 *   CONCURRENCY=10                        (default 8)
 */

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function parseBool(v: string | undefined, defaultValue: boolean) {
  if (v == null) return defaultValue;
  return ["1", "true", "yes", "y", "on"].includes(v.trim().toLowerCase());
}

function parseVisibility(
  v: string | undefined,
  defaultValue: Visibility,
): Visibility {
  const s = (v ?? "").trim().toUpperCase();
  if (s === "PUBLIC") return Visibility.PUBLIC;
  if (s === "PRIVATE") return Visibility.PRIVATE;
  return defaultValue;
}

/** FNV-1a 32-bit hash */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG */
function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rng = () => number;

function rngInt(rng: Rng, minInclusive: number, maxInclusive: number) {
  const span = maxInclusive - minInclusive + 1;
  return minInclusive + Math.floor(rng() * span);
}

function pick<T>(rng: Rng, arr: readonly T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickUnique<T>(rng: Rng, arr: readonly T[], count: number): T[] {
  const n = Math.max(0, Math.min(count, arr.length));
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

async function withConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, idx: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;

  async function runOne() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await worker(items[i], i);
    }
  }

  const runners = Array.from({ length: Math.max(1, limit) }, () => runOne());
  await Promise.all(runners);
  return out;
}

type CategorySeed = {
  slug: string;
  name: string;
  type: CategoryType;
  isAdult: boolean;
  order: number;
};

const CATEGORIES: CategorySeed[] = [
  // SAFE
  {
    slug: "safe-romance",
    name: "Romance",
    type: CategoryType.GENRE,
    isAdult: false,
    order: 10,
  },
  {
    slug: "safe-friendship",
    name: "Friendship",
    type: CategoryType.GENRE,
    isAdult: false,
    order: 20,
  },
  {
    slug: "safe-slice-of-life",
    name: "Slice of Life",
    type: CategoryType.GENRE,
    isAdult: false,
    order: 30,
  },
  {
    slug: "safe-adventure",
    name: "Adventure (Realistic)",
    type: CategoryType.GENRE,
    isAdult: false,
    order: 40,
  },
  {
    slug: "safe-comedy",
    name: "Comedy",
    type: CategoryType.TONE,
    isAdult: false,
    order: 50,
  },
  {
    slug: "safe-flirty",
    name: "Flirty (Safe)",
    type: CategoryType.TONE,
    isAdult: false,
    order: 60,
  },
  {
    slug: "safe-wholesome",
    name: "Wholesome",
    type: CategoryType.TONE,
    isAdult: false,
    order: 70,
  },
  {
    slug: "safe-slow-burn",
    name: "Slow Burn (Safe)",
    type: CategoryType.TONE,
    isAdult: false,
    order: 80,
  },

  // ADULT (18+)
  {
    slug: "adult-flirty",
    name: "Flirty (18+)",
    type: CategoryType.TONE,
    isAdult: true,
    order: 110,
  },
  {
    slug: "adult-romance",
    name: "Romance (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 120,
  },
  {
    slug: "adult-couples",
    name: "Couples (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 130,
  },
  {
    slug: "adult-mature",
    name: "Mature (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 140,
  },
  {
    slug: "adult-bdsm",
    name: "BDSM (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 150,
  },
  {
    slug: "adult-dominant",
    name: "Dominant (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 160,
  },
  {
    slug: "adult-supernatural",
    name: "Supernatural (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 170,
  },
  {
    slug: "adult-fantasy",
    name: "Fantasy (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 180,
  },
  {
    slug: "adult-gilf",
    name: "Gilf (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 190,
  },
  {
    slug: "adult-milf",
    name: "MILF (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 200,
  },
  {
    slug: "adult-sadistic",
    name: "Sadistic (18+)",
    type: CategoryType.GENRE,
    isAdult: true,
    order: 210,
  },

  // TRAITS
  {
    slug: "trait-gentle",
    name: "Gentle",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 190,
  },
  {
    slug: "trait-witty",
    name: "Witty",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 200,
  },
  {
    slug: "trait-bold",
    name: "Bold",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 210,
  },
  {
    slug: "trait-thoughtful",
    name: "Thoughtful",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 220,
  },
  {
    slug: "trait-confident",
    name: "Confident",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 230,
  },
  {
    slug: "trait-protective",
    name: "Protective",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 240,
  },
  {
    slug: "trait-adaptable",
    name: "Adaptable",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 241,
  },
  {
    slug: "trait-adventurous",
    name: "Adventurous",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 242,
  },
  {
    slug: "trait-altruistic",
    name: "Altruistic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 243,
  },
  {
    slug: "trait-analytical",
    name: "Analytical",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 244,
  },
  {
    slug: "trait-arrogant",
    name: "Arrogant",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 245,
  },
  {
    slug: "trait-assertive",
    name: "Assertive",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 246,
  },
  {
    slug: "trait-astute",
    name: "Astute",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 247,
  },
  {
    slug: "trait-caring",
    name: "Caring",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 248,
  },
  {
    slug: "trait-cautious",
    name: "Cautious",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 249,
  },
  {
    slug: "trait-charismatic",
    name: "Charismatic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 250,
  },
  {
    slug: "trait-charming",
    name: "Charming",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 251,
  },
  {
    slug: "trait-compassionate",
    name: "Compassionate",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 252,
  },
  {
    slug: "trait-conscientious",
    name: "Conscientious",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 253,
  },
  {
    slug: "trait-cooperative",
    name: "Cooperative",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 254,
  },
  {
    slug: "trait-courageous",
    name: "Courageous",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 255,
  },
  {
    slug: "trait-courteous",
    name: "Courteous",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 256,
  },
  {
    slug: "trait-creative",
    name: "Creative",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 257,
  },
  {
    slug: "trait-cruel",
    name: "Cruel",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 258,
  },
  {
    slug: "trait-cynical",
    name: "Cynical",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 259,
  },
  {
    slug: "trait-ebullient",
    name: "Ebullient",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 260,
  },
  {
    slug: "trait-eccentric",
    name: "Eccentric",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 261,
  },
  {
    slug: "trait-eclectic",
    name: "Eclectic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 262,
  },
  {
    slug: "trait-egotistical",
    name: "Egotistical",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 263,
  },
  {
    slug: "trait-eloquent",
    name: "Eloquent",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 264,
  },
  {
    slug: "trait-empathetic",
    name: "Empathetic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 265,
  },
  {
    slug: "trait-empathic",
    name: "Empathic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 266,
  },
  {
    slug: "trait-empowering",
    name: "Empowering",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 267,
  },
  {
    slug: "trait-energetic",
    name: "Energetic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 268,
  },
  {
    slug: "trait-enigmatic",
    name: "Enigmatic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 269,
  },
  {
    slug: "trait-enthusiastic",
    name: "Enthusiastic",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 270,
  },
  {
    slug: "trait-patient",
    name: "Patient",
    type: CategoryType.TRAIT,
    isAdult: false,
    order: 271,
  },
  // ADULT TRAITS
  {
    slug: "trait-teasing",
    name: "Teasing",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 272,
  },
  {
    slug: "trait-seductive",
    name: "Seductive",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 273,
  },
  {
    slug: "trait-sensual",
    name: "Sensual",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 274,
  },
  {
    slug: "trait-flirtatious",
    name: "Flirtatious",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 275,
  },
  {
    slug: "trait-intense",
    name: "Intense",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 276,
  },
  {
    slug: "trait-passionate",
    name: "Passionate",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 277,
  },
  {
    slug: "trait-devoted",
    name: "Devoted",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 278,
  },
  {
    slug: "trait-possessive",
    name: "Possessive",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 279,
  },
  {
    slug: "trait-alluring",
    name: "Alluring",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 280,
  },
  {
    slug: "trait-provocative",
    name: "Provocative",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 281,
  },
  {
    slug: "trait-commanding",
    name: "Commanding",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 282,
  },
  {
    slug: "trait-obedient",
    name: "Obedient",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 283,
  },
  {
    slug: "trait-restrained",
    name: "Restrained",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 284,
  },
  {
    slug: "trait-attentive",
    name: "Attentive",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 285,
  },
  {
    slug: "trait-affectionate",
    name: "Affectionate",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 286,
  },
  {
    slug: "trait-needy",
    name: "Needy",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 287,
  },
  {
    slug: "trait-yearning",
    name: "Yearning",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 288,
  },
  {
    slug: "trait-obsessive",
    name: "Obsessive",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 289,
  },
  {
    slug: "trait-worshipful",
    name: "Worshipful",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 290,
  },
  {
    slug: "trait-praise-seeking",
    name: "Praise-Seeking",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 291,
  },
  {
    slug: "trait-praise-giving",
    name: "Praise-Giving",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 292,
  },
  {
    slug: "trait-bratty",
    name: "Bratty",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 293,
  },
  {
    slug: "trait-brat-tamer",
    name: "Brat Tamer",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 294,
  },
  {
    slug: "trait-service-oriented",
    name: "Service-Oriented",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 295,
  },
  {
    slug: "trait-pleasing",
    name: "Pleasing",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 296,
  },
  {
    slug: "trait-dominant",
    name: "Dominant (18+)",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 300,
  },
  {
    slug: "trait-submissive",
    name: "Submissive (18+)",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 310,
  },
  {
    slug: "trait-strict",
    name: "Strict (18+)",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 311,
  },
  {
    slug: "trait-mischievous",
    name: "Mischievous (18+)",
    type: CategoryType.TRAIT,
    isAdult: true,
    order: 312,
  },

  // KINKS (consent-only, non-graphic)
  {
    slug: "kink-powerplay",
    name: "Power Play (18+)",
    type: CategoryType.KINK,
    isAdult: true,
    order: 400,
  },
  {
    slug: "kink-praise",
    name: "Praise (18+)",
    type: CategoryType.KINK,
    isAdult: true,
    order: 410,
  },
  {
    slug: "kink-teasing",
    name: "Teasing (18+)",
    type: CategoryType.KINK,
    isAdult: true,
    order: 420,
  },
  {
    slug: "kink-roleplay",
    name: "Roleplay (18+)",
    type: CategoryType.KINK,
    isAdult: true,
    order: 430,
  },

  // NEW: OCCUPATION (filterable)
  {
    slug: "occ-barista",
    name: "Barista",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1000,
  },
  {
    slug: "occ-chef",
    name: "Chef",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1010,
  },
  {
    slug: "occ-baker",
    name: "Baker",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1020,
  },
  {
    slug: "occ-teacher",
    name: "Teacher",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1030,
  },
  {
    slug: "occ-nurse",
    name: "Nurse",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1040,
  },
  {
    slug: "occ-engineer",
    name: "Engineer",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1050,
  },
  {
    slug: "occ-designer",
    name: "Designer",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1060,
  },
  {
    slug: "occ-photographer",
    name: "Photographer",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1070,
  },
  {
    slug: "occ-trainer",
    name: "Trainer/Coach",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1080,
  },
  {
    slug: "occ-writer",
    name: "Writer",
    type: CategoryType.OCCUPATION,
    isAdult: false,
    order: 1090,
  },

  // NEW: SETTING (filterable)
  {
    slug: "set-cafe",
    name: "Café",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1200,
  },
  {
    slug: "set-bookstore",
    name: "Bookstore",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1210,
  },
  {
    slug: "set-gym",
    name: "Gym",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1220,
  },
  {
    slug: "set-kitchen",
    name: "Kitchen",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1230,
  },
  {
    slug: "set-roadtrip",
    name: "Road Trip",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1240,
  },
  {
    slug: "set-hike",
    name: "Hiking Trail",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1250,
  },
  {
    slug: "set-studio",
    name: "Studio/Creative Space",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1260,
  },
  {
    slug: "set-library",
    name: "Library",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1270,
  },
  {
    slug: "set-diner",
    name: "Diner (Late Night)",
    type: CategoryType.SETTING,
    isAdult: false,
    order: 1280,
  },

  // NEW: RELATIONSHIP (filterable)
  {
    slug: "rel-friends",
    name: "Friends",
    type: CategoryType.RELATIONSHIP,
    isAdult: false,
    order: 1400,
  },
  {
    slug: "rel-romantic",
    name: "Romantic",
    type: CategoryType.RELATIONSHIP,
    isAdult: false,
    order: 1410,
  },
  {
    slug: "rel-slowburn",
    name: "Slow Burn",
    type: CategoryType.RELATIONSHIP,
    isAdult: false,
    order: 1420,
  },
  {
    slug: "rel-flirty",
    name: "Flirty",
    type: CategoryType.RELATIONSHIP,
    isAdult: false,
    order: 1430,
  },
  {
    slug: "rel-couple",
    name: "Couple",
    type: CategoryType.RELATIONSHIP,
    isAdult: true,
    order: 1440,
  },
];

type Kind = "man" | "woman" | "couple";

type Archetype = {
  id: string;
  label: string;
  kind: Kind;
  settings: readonly string[];
  occupations: readonly string[];
  safeHooks: readonly string[];
  adultHooks: readonly string[];
  safeBaseCategories: readonly string[];
  adultBaseCategories: readonly string[];
  occSlugs: readonly string[];
  settingSlugs: readonly string[];
  relationshipSlugsSafe: readonly string[];
  relationshipSlugsAdult: readonly string[];
};

const SAFE_HOOKS = [
  "Easy to talk to, surprisingly attentive.",
  "Warm humor, calm presence, good listener.",
  "Supportive energy and thoughtful questions.",
  "Playful banter with genuine kindness.",
  "Grounded, steady, and low-drama.",
] as const;

const ADULT_HOOKS = [
  "Adult-only flirting with clear boundaries and check-ins.",
  "Consent-first teasing; you set the pace.",
  "Suggestive tension that stays respectful and non-graphic.",
  "Confident vibe, never pushy, always attentive to comfort.",
  "Playful praise and teasing within your limits.",
] as const;

/**
 * Archetypes: you can keep your big list here; below is a compact example set.
 * Add/extend as you like: just include occSlugs / settingSlugs / relationshipSlugs*
 */
const ARCHETYPES: Archetype[] = [
  {
    id: "charming-barista",
    label: "Charming Barista",
    kind: "man",
    settings: ["a cozy café", "a quiet corner booth", "a rainy morning rush"],
    occupations: ["barista", "coffee roaster", "café manager"],
    safeHooks: ["Remembers your order and your stories.", ...SAFE_HOOKS],
    adultHooks: ["A confident flirt with a soft touch.", ...ADULT_HOOKS],
    safeBaseCategories: [
      "safe-slice-of-life",
      "safe-friendship",
      "safe-flirty",
    ],
    adultBaseCategories: ["adult-flirty", "adult-romance"],
    occSlugs: ["occ-barista"],
    settingSlugs: ["set-cafe"],
    relationshipSlugsSafe: ["rel-friends", "rel-flirty"],
    relationshipSlugsAdult: ["rel-romantic", "rel-flirty"],
  },
  {
    id: "bookstore-poet",
    label: "Bookstore Poet",
    kind: "man",
    settings: [
      "a quiet bookstore",
      "a poetry open mic",
      "a late-night reading nook",
    ],
    occupations: ["bookseller", "writer", "editor"],
    safeHooks: [
      "Gentle words, thoughtful questions, calm presence.",
      ...SAFE_HOOKS,
    ],
    adultHooks: ["Soft-spoken romance with slow-burn tension.", ...ADULT_HOOKS],
    safeBaseCategories: [
      "safe-romance",
      "safe-slow-burn",
      "safe-slice-of-life",
    ],
    adultBaseCategories: ["adult-romance", "adult-flirty", "adult-mature"],
    occSlugs: ["occ-writer"],
    settingSlugs: ["set-bookstore"],
    relationshipSlugsSafe: ["rel-romantic", "rel-slowburn"],
    relationshipSlugsAdult: ["rel-romantic", "rel-slowburn"],
  },
  {
    id: "gym-buddy",
    label: "Gym Buddy",
    kind: "woman",
    settings: [
      "a gym session",
      "a post-workout smoothie stop",
      "a morning run",
    ],
    occupations: ["trainer", "coach", "physical therapist"],
    safeHooks: ["Motivating, upbeat, genuinely kind.", ...SAFE_HOOKS],
    adultHooks: [
      "Adult-only flirting with confident but respectful energy.",
      ...ADULT_HOOKS,
    ],
    safeBaseCategories: ["safe-friendship", "safe-comedy", "safe-flirty"],
    adultBaseCategories: ["adult-flirty", "adult-romance"],
    occSlugs: ["occ-trainer"],
    settingSlugs: ["set-gym"],
    relationshipSlugsSafe: ["rel-friends", "rel-flirty"],
    relationshipSlugsAdult: ["rel-flirty", "rel-romantic"],
  },
  {
    id: "single-dad-chef",
    label: "Single Dad Chef",
    kind: "man",
    settings: ["a small kitchen", "a farmer’s market", "a relaxed dinner prep"],
    occupations: ["chef", "baker", "line cook"],
    safeHooks: ["Cozy acts of service and steady kindness.", ...SAFE_HOOKS],
    adultHooks: ["Warm confidence and grounded romance.", ...ADULT_HOOKS],
    safeBaseCategories: [
      "safe-slice-of-life",
      "safe-romance",
      "safe-wholesome",
    ],
    adultBaseCategories: ["adult-romance", "adult-mature", "adult-flirty"],
    occSlugs: ["occ-chef", "occ-baker"],
    settingSlugs: ["set-kitchen"],
    relationshipSlugsSafe: ["rel-romantic", "rel-slowburn"],
    relationshipSlugsAdult: ["rel-romantic", "rel-slowburn"],
  },
  {
    id: "married-adventurers",
    label: "Married Adventurers",
    kind: "couple",
    settings: [
      "a weekend road trip",
      "a hiking trail with views",
      "a cozy cabin getaway",
    ],
    occupations: ["travel blogger", "photographer", "outdoor guide"],
    safeHooks: [
      "Two best friends with a welcoming, supportive vibe.",
      ...SAFE_HOOKS,
    ],
    adultHooks: [
      "Adult-only couple flirting, consent-first and non-graphic.",
      ...ADULT_HOOKS,
    ],
    safeBaseCategories: ["safe-friendship", "safe-adventure", "safe-comedy"],
    adultBaseCategories: ["adult-couples", "adult-flirty"],
    occSlugs: ["occ-photographer", "occ-writer"],
    settingSlugs: ["set-roadtrip", "set-hike"],
    relationshipSlugsSafe: ["rel-friends"],
    relationshipSlugsAdult: ["rel-couple"],
  },
];

const FIRST_NAMES_M = [
  "Adrian",
  "Alex",
  "Amir",
  "Andre",
  "Antonio",
  "Avery",
  "Ben",
  "Blake",
  "Caleb",
  "Carter",
  "Damon",
  "Darius",
  "Diego",
  "Elias",
  "Elliot",
  "Emmett",
  "Evan",
  "Felix",
  "Gabe",
  "Hassan",
  "Henry",
  "Isaac",
  "Jamal",
  "Javier",
  "Jonah",
  "Jordan",
  "Julian",
  "Kai",
  "Kareem",
  "Leo",
  "Liam",
  "Lucas",
  "Malik",
  "Marco",
  "Mateo",
  "Miles",
  "Nate",
  "Noah",
  "Omar",
  "Orion",
  "Parker",
  "Rafael",
  "Reed",
  "Rowan",
  "Sam",
  "Sebastian",
  "Shawn",
  "Theo",
  "Tristan",
  "Victor",
  "Wes",
  "Xavier",
  "Yusuf",
  "Zane",
] as const;

const FIRST_NAMES_F = [
  "Aaliyah",
  "Ada",
  "Alina",
  "Amara",
  "Ana",
  "Aria",
  "Ava",
  "Bianca",
  "Brielle",
  "Camila",
  "Carmen",
  "Cassidy",
  "Chloe",
  "Dahlia",
  "Dani",
  "Elena",
  "Emery",
  "Esme",
  "Fiona",
  "Freya",
  "Gemma",
  "Hailey",
  "Hana",
  "Inez",
  "Iris",
  "Jade",
  "Janelle",
  "Jasmine",
  "Jo",
  "Kali",
  "Keira",
  "Lena",
  "Lia",
  "Lila",
  "Lily",
  "Luna",
  "Maya",
  "Mina",
  "Naomi",
  "Nia",
  "Nora",
  "Olivia",
  "Phoebe",
  "Quinn",
  "Raina",
  "Sage",
  "Sienna",
  "Sofia",
  "Talia",
  "Valeria",
  "Wren",
  "Yara",
  "Zoe",
] as const;

const LAST_NAMES = [
  "Reyes",
  "Nguyen",
  "Patel",
  "Kim",
  "Johnson",
  "Lopez",
  "Gonzalez",
  "Hernandez",
  "Ali",
  "Singh",
  "Carter",
  "Diaz",
  "Bennett",
  "Brooks",
  "Parker",
  "Price",
  "Rivera",
  "Santos",
  "Morris",
  "Ward",
  "Collins",
  "Murphy",
  "Bell",
  "Cook",
  "Cooper",
  "Bailey",
  "Flores",
  "Turner",
  "Campbell",
  "Mitchell",
  "Young",
  "Scott",
  "King",
  "Green",
  "Baker",
  "Adams",
  "Nelson",
  "Hill",
  "Ramirez",
  "Clark",
  "Lewis",
  "Walker",
  "Hall",
  "Allen",
  "Torres",
  "Wright",
] as const;

const PRONOUNS_BY_KIND: Record<Exclude<Kind, "couple">, readonly string[]> = {
  man: ["he/him", "he/they"],
  woman: ["she/her", "she/they"],
} as const;

const SAFE_TONES = [
  "playful",
  "wholesome",
  "cozy",
  "uplifting",
  "slow-burn",
  "witty",
] as const;
const ADULT_TONES = [
  "teasing",
  "bold",
  "confident",
  "sultry",
  "slow-burn",
  "strict",
  "sadistic",
  "praise",
] as const;

const SAFE_TRAIT_SLUGS = [
  "trait-gentle",
  "trait-patient",
  "trait-witty",
  "trait-bold",
  "trait-thoughtful",
  "trait-confident",
  "trait-protective",
  "trait-adaptable",
  "trait-adventurous",
  "trait-altruistic",
  "trait-analytical",
  "trait-arrogant",
  "trait-assertive",
  "trait-astute",
  "trait-caring",
  "trait-cautious",
  "trait-charismatic",
  "trait-charming",
  "trait-compassionate",
  "trait-conscientious",
  "trait-cooperative",
  "trait-courageous",
  "trait-courteous",
  "trait-creative",
  "trait-cruel",
  "trait-cynical",
  "trait-ebullient",
  "trait-eccentric",
  "trait-eclectic",
  "trait-egotistical",
  "trait-eloquent",
  "trait-empathetic",
  "trait-empathic",
  "trait-empowering",
  "trait-energetic",
  "trait-enigmatic",
  "trait-enthusiastic",
  "trait-mischievous",
] as const;

const ADULT_TRAIT_SLUGS = [
  "trait-dominant",
  "trait-submissive",
  "trait-strict",
  "trait-assertive",
  "trait-confident",
  "trait-charismatic",
  "trait-charming",
  "trait-enigmatic",
  "trait-empowering",
  "trait-adventurous",
  "trait-teasing",
  "trait-seductive",
  "trait-sensual",
  "trait-flirtatious",
  "trait-bold",
  "trait-intense",
  "trait-passionate",
  "trait-devoted",
  "trait-possessive",
  "trait-protective",
  "trait-playful",
  "trait-mischievous",
  "trait-alluring",
  "trait-provocative",
  "trait-commanding",
  "trait-obedient",
  "trait-restrained",
  "trait-patient",
  "trait-attentive",
  "trait-affectionate",
  "trait-needy",
  "trait-yearning",
  "trait-obsessive",
  "trait-worshipful",
  "trait-praise-seeking",
  "trait-praise-giving",
  "trait-bratty",
  "trait-brat-tamer",
  "trait-service-oriented",
  "trait-pleasing",
  "trait-mischievous",
] as const;

const HOBBIES = [
  "cooking something new",
  "late-night walks",
  "bad puns",
  "live music",
  "binge-reading",
  "film nights",
  "gym sessions",
  "trying new cafés",
  "stargazing",
  "photography",
  "hiking",
  "board games",
  "journaling",
  "learning languages",
  "museum trips",
  "podcasts",
  "small road trips",
  "baking",
] as const;

const QUIRKS = [
  "Keeps a running list of your favorite things.",
  "Sends voice notes when texting feels too cold.",
  "Laughs easily and makes you feel included.",
  "Has a calm presence even on chaotic days.",
  "Notices the little shifts in your mood and checks in.",
  "Can be teasing, but always kind about it.",
] as const;

const BOUNDARIES_ADULT = [
  "Consent-first with frequent check-ins.",
  "No pressure—your comfort level leads.",
  "Keeps things non-graphic unless your app explicitly allows more.",
  "Respects boundaries immediately and consistently.",
] as const;

type CompanionSeed = {
  slug: string;
  name: string;
  description: string;
  tags: string[];
  archetype?: string;
  profile?: object;
  visibility: Visibility;
  contentRating: ContentRating;
  categorySlugs: string[];
};

function makePersonName(rng: Rng, kind: Exclude<Kind, "couple">) {
  const first =
    kind === "man" ? pick(rng, FIRST_NAMES_M) : pick(rng, FIRST_NAMES_F);
  const last = pick(rng, LAST_NAMES);
  const pronouns = pick(rng, PRONOUNS_BY_KIND[kind]);
  return { display: `${first} ${last}`, first, last, pronouns };
}

function makeCoupleName(rng: Rng) {
  const kindA: Exclude<Kind, "couple"> = rng() < 0.5 ? "man" : "woman";
  const kindB: Exclude<Kind, "couple"> = rng() < 0.5 ? "man" : "woman";
  const p1 = makePersonName(rng, kindA);
  const p2 = makePersonName(rng, kindB);
  const display = `${p1.first} & ${p2.first} ${pick(rng, LAST_NAMES)}`;
  return { display, a: p1.display, b: p2.display };
}

function buildDescriptionSafe(rng: Rng, a: Archetype, personLabel: string) {
  const hook = pick(rng, a.safeHooks);
  const setting = pick(rng, a.settings);
  const hobby = pick(rng, HOBBIES);
  const quirk = pick(rng, QUIRKS);
  const tone = pick(rng, SAFE_TONES);
  return `${personLabel} — ${hook} You meet in ${setting}. Loves ${hobby}. ${quirk} Tone: ${tone}.`;
}

function buildDescriptionAdult(rng: Rng, a: Archetype, personLabel: string) {
  const hook = pick(rng, a.adultHooks);
  const setting = pick(rng, a.settings);
  const hobby = pick(rng, HOBBIES);
  const boundary = pick(rng, BOUNDARIES_ADULT);
  const tone = pick(rng, ADULT_TONES);
  return `${personLabel} — ${hook} Vibe: ${tone}. Setting: ${setting}. Likes ${hobby}. ${boundary}`;
}

function buildCategoriesSafe(rng: Rng, a: Archetype): string[] {
  const base = [...a.safeBaseCategories];
  const trait = pick(rng, SAFE_TRAIT_SLUGS);
  const extra = pickUnique(
    rng,
    [
      "safe-romance",
      "safe-friendship",
      "safe-slice-of-life",
      "safe-adventure",
      "safe-comedy",
      "safe-wholesome",
      "safe-slow-burn",
      "safe-flirty",
    ] as const,
    2,
  );

  const occ = pickUnique(
    rng,
    a.occSlugs,
    rngInt(rng, 1, Math.min(2, a.occSlugs.length)),
  );
  const set = pickUnique(
    rng,
    a.settingSlugs,
    rngInt(rng, 1, Math.min(2, a.settingSlugs.length)),
  );
  const rel = pickUnique(rng, a.relationshipSlugsSafe, 1);

  return [
    ...new Set<string>([...base, trait, ...extra, ...occ, ...set, ...rel]),
  ];
}

function buildCategoriesAdult(rng: Rng, a: Archetype): string[] {
  const base = [...a.adultBaseCategories];
  const maybeBdsm = rng() < 0.35 ? ["adult-bdsm"] : [];
  const maybeAdultTrait = rng() < 0.35 ? [pick(rng, ADULT_TRAIT_SLUGS)] : [];
  const maybeKinks =
    rng() < 0.45
      ? pickUnique(
          rng,
          [
            "kink-powerplay",
            "kink-praise",
            "kink-teasing",
            "kink-roleplay",
          ] as const,
          rngInt(rng, 1, 2),
        )
      : [];

  const occ = pickUnique(
    rng,
    a.occSlugs,
    rngInt(rng, 1, Math.min(2, a.occSlugs.length)),
  );
  const set = pickUnique(
    rng,
    a.settingSlugs,
    rngInt(rng, 1, Math.min(2, a.settingSlugs.length)),
  );
  const rel = pickUnique(rng, a.relationshipSlugsAdult, 1);

  return [
    ...new Set<string>([
      ...base,
      ...maybeBdsm,
      ...maybeAdultTrait,
      ...maybeKinks,
      ...occ,
      ...set,
      ...rel,
    ]),
  ];
}

function generateCompanions(opts: {
  countPerArchetype: number;
  seed: string;
  includeAdult: boolean;
  adultVisibility: Visibility;
}): CompanionSeed[] {
  const out: CompanionSeed[] = [];
  const usedNames = new Set<string>();

  const makeUniqueName = (candidate: string, fallbackRng: Rng) => {
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    const suffixes = ["(II)", "(III)", "(IV)", "(V)", "(VI)", "(VII)"] as const;
    for (const s of suffixes) {
      const v = `${candidate} ${s}`;
      if (!usedNames.has(v)) {
        usedNames.add(v);
        return v;
      }
    }
    const n = rngInt(fallbackRng, 100, 999);
    const v = `${candidate} #${n}`;
    usedNames.add(v);
    return v;
  };

  for (const a of ARCHETYPES) {
    for (let i = 0; i < opts.countPerArchetype; i++) {
      const safeRng = mulberry32(hash32(`${opts.seed}|${a.id}|${i}|safe`));
      const adultRng = mulberry32(hash32(`${opts.seed}|${a.id}|${i}|adult`));

      const baseLabel =
        a.kind === "couple"
          ? makeCoupleName(safeRng).display
          : makePersonName(safeRng, a.kind).display;

      const safeName = makeUniqueName(`${baseLabel} — ${a.label}`, safeRng);
      const safeSlug = slugify(`${a.id}-${i + 1}-safe`);

      out.push({
        slug: safeSlug,
        name: safeName,
        description: buildDescriptionSafe(safeRng, a, safeName),
        tags: [a.kind, "safe", a.id, pick(safeRng, SAFE_TONES)],
        archetype: a.label,
        profile: {
          kind: a.kind,
          rating: "safe",
          adultsOnly: true,
          ageMin: 18,
          tone: pick(safeRng, SAFE_TONES),
          occupationTags: a.occSlugs,
          settingTags: a.settingSlugs,
        },
        visibility: Visibility.PUBLIC,
        contentRating: ContentRating.SAFE,
        categorySlugs: buildCategoriesSafe(safeRng, a),
      });

      if (!opts.includeAdult) continue;

      const adultBaseLabel =
        a.kind === "couple"
          ? makeCoupleName(adultRng).display
          : makePersonName(adultRng, a.kind).display;

      const adultName = makeUniqueName(
        `${adultBaseLabel} — ${a.label} (18+)`,
        adultRng,
      );
      const adultSlug = slugify(`${a.id}-${i + 1}-adult`);

      out.push({
        slug: adultSlug,
        name: adultName,
        description: buildDescriptionAdult(adultRng, a, adultName),
        tags: [a.kind, "adult", a.id, pick(adultRng, ADULT_TONES)],
        archetype: a.label,
        profile: {
          kind: a.kind,
          rating: "adult",
          adultsOnly: true,
          ageMin: 18,
          tone: pick(adultRng, ADULT_TONES),
          boundaries: pickUnique(adultRng, BOUNDARIES_ADULT, 2),
          occupationTags: a.occSlugs,
          settingTags: a.settingSlugs,
        },
        visibility: opts.adultVisibility,
        contentRating: ContentRating.ADULT,
        categorySlugs: buildCategoriesAdult(adultRng, a),
      });
    }
  }

  return out;
}

async function upsertCategories() {
  await withConcurrency(CATEGORIES, 8, async (c) => {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        type: c.type,
        isAdult: c.isAdult,
        order: c.order,
      },
      create: {
        slug: c.slug,
        name: c.name,
        type: c.type,
        isAdult: c.isAdult,
        order: c.order,
      },
    });
  });
}

async function getCategoryIdMap(): Promise<Map<string, string>> {
  const rows = await prisma.category.findMany({
    select: { id: true, slug: true },
  });
  return new Map(rows.map((r) => [r.slug, r.id]));
}

async function upsertCompanion(c: CompanionSeed): Promise<string> {
  const row = await prisma.companion.upsert({
    where: { slug: c.slug },
    update: {
      name: c.name,
      description: c.description,
      tags: c.tags,
      archetype: c.archetype,
      profile: c.profile as any,
      visibility: c.visibility,
      contentRating: c.contentRating,
    },
    create: {
      name: c.name,
      slug: c.slug,
      description: c.description,
      tags: c.tags,
      archetype: c.archetype,
      profile: c.profile as any,
      visibility: c.visibility,
      contentRating: c.contentRating,
    },
    select: { id: true },
  });

  return row.id;
}

async function attachCategories(
  companionId: string,
  categorySlugs: string[],
  categoryIdMap: Map<string, string>,
) {
  const categoryIds = categorySlugs.map((slug) => {
    const id = categoryIdMap.get(slug);
    if (!id) throw new Error(`Missing category slug: ${slug}`);
    return id;
  });

  await prisma.companionCategory.createMany({
    data: categoryIds.map((categoryId) => ({ companionId, categoryId })),
    skipDuplicates: true,
  });
}

async function main() {
  const countPerArchetype = Number(
    process.env.SEED_COUNT_PER_ARCHETYPE ?? "25",
  );
  const seed = (process.env.SEED_RANDOM ?? "default").trim();
  const includeAdult = parseBool(process.env.INCLUDE_ADULT, true);
  const adultVisibility = parseVisibility(
    process.env.ADULT_VISIBILITY,
    Visibility.PUBLIC,
  );
  const concurrency = Number(process.env.CONCURRENCY ?? "8");

  await upsertCategories();
  const categoryIdMap = await getCategoryIdMap();

  const companions = generateCompanions({
    countPerArchetype,
    seed,
    includeAdult,
    adultVisibility,
  });

  await withConcurrency(companions, concurrency, async (c) => {
    const id = await upsertCompanion(c);
    await attachCategories(id, c.categorySlugs, categoryIdMap);
  });

  console.log(
    `Seeded categories=${CATEGORIES.length}, companions=${companions.length} (adult=${includeAdult ? "on" : "off"}, adultVisibility=${adultVisibility}, seed="${seed}")`,
  );
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
