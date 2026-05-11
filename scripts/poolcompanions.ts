// prisma/seed-companions.ts

import {
    PrismaClient,
    CategoryType,
    ContentRating,
    Visibility,
} from "@prisma/client";

const prisma = new PrismaClient();

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

function hash32(input: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

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

function uniqueStrings(values: readonly string[]) {
    return [...new Set(values.filter(Boolean))];
}

function titleCase(value: string) {
    return value
        .split(/[\s-]+/)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

type Kind = "man" | "woman" | "couple" | "any";
type Style = "grounded" | "fantasy" | "scifi";

type CategorySeed = {
    slug: string;
    name: string;
    type: CategoryType;
    isAdult: boolean;
    order: number;
};

type FlexibleArchetype = {
    id: string;
    label: string;
    kind: Kind;
    style: Style;
    allowedOccupationSlugs: readonly string[];
    allowedSettingSlugs: readonly string[];
    allowedRelationshipSlugsSafe: readonly string[];
    allowedRelationshipSlugsAdult: readonly string[];
    safeBaseCategories: readonly string[];
    adultBaseCategories: readonly string[];
    safeHooks: readonly string[];
    adultHooks: readonly string[];
    preferredSpecies?: readonly string[];
    preferredAesthetics?: readonly string[];
};

type GeneratedProfile = {
    archetypeId: string;
    archetypeLabel: string;
    kind: Kind;
    style: Style;
    occupationSlugs: string[];
    settingSlugs: string[];
    relationshipSlugs: string[];
    categorySlugs: string[];
    species: string;
    aesthetic: string;
    safeHook: string;
    adultHook: string;
    occupationNames: string[];
    settingNames: string[];
    relationshipNames: string[];
};

const CATEGORIES: CategorySeed[] = [
    { slug: "safe-romance", name: "Romance", type: CategoryType.GENRE, isAdult: false, order: 10 },
    { slug: "safe-friendship", name: "Friendship", type: CategoryType.GENRE, isAdult: false, order: 20 },
    { slug: "safe-slice-of-life", name: "Slice of Life", type: CategoryType.GENRE, isAdult: false, order: 30 },
    { slug: "safe-adventure", name: "Adventure", type: CategoryType.GENRE, isAdult: false, order: 40 },
    { slug: "safe-comedy", name: "Comedy", type: CategoryType.TONE, isAdult: false, order: 50 },
    { slug: "safe-flirty", name: "Flirty", type: CategoryType.TONE, isAdult: false, order: 60 },
    { slug: "safe-wholesome", name: "Wholesome", type: CategoryType.TONE, isAdult: false, order: 70 },
    { slug: "safe-slow-burn", name: "Slow Burn", type: CategoryType.TONE, isAdult: false, order: 80 },
    { slug: "safe-fantasy", name: "Fantasy", type: CategoryType.GENRE, isAdult: false, order: 81 },
    { slug: "safe-supernatural", name: "Supernatural", type: CategoryType.GENRE, isAdult: false, order: 82 },
    { slug: "safe-sci-fi", name: "Sci-Fi", type: CategoryType.GENRE, isAdult: false, order: 83 },
    { slug: "safe-mystery", name: "Mystery", type: CategoryType.GENRE, isAdult: false, order: 84 },
    { slug: "safe-gothic", name: "Gothic", type: CategoryType.TONE, isAdult: false, order: 85 },
    { slug: "safe-chaotic", name: "Chaotic", type: CategoryType.TONE, isAdult: false, order: 86 },
    { slug: "safe-haunted", name: "Haunted", type: CategoryType.TONE, isAdult: false, order: 87 },
    { slug: "safe-protective", name: "Protective", type: CategoryType.TONE, isAdult: false, order: 88 },
    { slug: "safe-action", name: "Action", type: CategoryType.GENRE, isAdult: false, order: 89 },
    { slug: "safe-dark-academia", name: "Dark Academia", type: CategoryType.TONE, isAdult: false, order: 90 },
    { slug: "safe-celebrity", name: "Celebrity", type: CategoryType.GENRE, isAdult: false, order: 91 },
    { slug: "safe-noir", name: "Noir", type: CategoryType.TONE, isAdult: false, order: 92 },
    { slug: "safe-found-family", name: "Found Family", type: CategoryType.RELATIONSHIP, isAdult: false, order: 93 },
    { slug: "safe-cozy", name: "Cozy", type: CategoryType.TONE, isAdult: false, order: 94 },
    { slug: "safe-witchy", name: "Witchy", type: CategoryType.TONE, isAdult: false, order: 95 },
    { slug: "safe-emotional", name: "Emotional", type: CategoryType.TONE, isAdult: false, order: 96 },
    { slug: "safe-redemption", name: "Redemption", type: CategoryType.TONE, isAdult: false, order: 97 },
    { slug: "safe-rivals", name: "Rivals", type: CategoryType.RELATIONSHIP, isAdult: false, order: 98 },

    { slug: "adult-flirty", name: "Flirty (18+)", type: CategoryType.TONE, isAdult: true, order: 110 },
    { slug: "adult-romance", name: "Romance (18+)", type: CategoryType.GENRE, isAdult: true, order: 120 },
    { slug: "adult-couples", name: "Couples (18+)", type: CategoryType.GENRE, isAdult: true, order: 130 },
    { slug: "adult-mature", name: "Mature (18+)", type: CategoryType.GENRE, isAdult: true, order: 140 },
    { slug: "adult-dominant", name: "Dominant (18+)", type: CategoryType.GENRE, isAdult: true, order: 150 },
    { slug: "adult-supernatural", name: "Supernatural (18+)", type: CategoryType.GENRE, isAdult: true, order: 160 },
    { slug: "adult-fantasy", name: "Fantasy (18+)", type: CategoryType.GENRE, isAdult: true, order: 170 },
    { slug: "adult-sci-fi", name: "Sci-Fi (18+)", type: CategoryType.GENRE, isAdult: true, order: 180 },
    { slug: "adult-gothic", name: "Gothic (18+)", type: CategoryType.TONE, isAdult: true, order: 190 },
    { slug: "adult-chaotic", name: "Chaotic (18+)", type: CategoryType.TONE, isAdult: true, order: 200 },
    { slug: "adult-protective", name: "Protective (18+)", type: CategoryType.TONE, isAdult: true, order: 210 },
    { slug: "adult-intense", name: "Intense (18+)", type: CategoryType.TONE, isAdult: true, order: 220 },
    { slug: "adult-dangerous", name: "Dangerous (18+)", type: CategoryType.TONE, isAdult: true, order: 230 },
    { slug: "adult-dark", name: "Dark (18+)", type: CategoryType.TONE, isAdult: true, order: 240 },
    { slug: "adult-angst", name: "Angst (18+)", type: CategoryType.TONE, isAdult: true, order: 250 },
    { slug: "adult-slowburn", name: "Slow Burn (18+)", type: CategoryType.TONE, isAdult: true, order: 260 },
    { slug: "adult-soft", name: "Soft (18+)", type: CategoryType.TONE, isAdult: true, order: 270 },

    { slug: "occ-barista", name: "Barista", type: CategoryType.OCCUPATION, isAdult: false, order: 1000 },
    { slug: "occ-chef", name: "Chef", type: CategoryType.OCCUPATION, isAdult: false, order: 1010 },
    { slug: "occ-baker", name: "Baker", type: CategoryType.OCCUPATION, isAdult: false, order: 1020 },
    { slug: "occ-teacher", name: "Teacher", type: CategoryType.OCCUPATION, isAdult: false, order: 1030 },
    { slug: "occ-nurse", name: "Nurse", type: CategoryType.OCCUPATION, isAdult: false, order: 1040 },
    { slug: "occ-engineer", name: "Engineer", type: CategoryType.OCCUPATION, isAdult: false, order: 1050 },
    { slug: "occ-designer", name: "Designer", type: CategoryType.OCCUPATION, isAdult: false, order: 1060 },
    { slug: "occ-photographer", name: "Photographer", type: CategoryType.OCCUPATION, isAdult: false, order: 1070 },
    { slug: "occ-trainer", name: "Trainer/Coach", type: CategoryType.OCCUPATION, isAdult: false, order: 1080 },
    { slug: "occ-writer", name: "Writer", type: CategoryType.OCCUPATION, isAdult: false, order: 1090 },
    { slug: "occ-archivist", name: "Archivist", type: CategoryType.OCCUPATION, isAdult: false, order: 1100 },
    { slug: "occ-alchemist", name: "Alchemist", type: CategoryType.OCCUPATION, isAdult: false, order: 1110 },
    { slug: "occ-witch", name: "Witch", type: CategoryType.OCCUPATION, isAdult: false, order: 1120 },
    { slug: "occ-bounty-hunter", name: "Bounty Hunter", type: CategoryType.OCCUPATION, isAdult: false, order: 1130 },
    { slug: "occ-starship-pilot", name: "Starship Pilot", type: CategoryType.OCCUPATION, isAdult: false, order: 1140 },
    { slug: "occ-rune-smith", name: "Rune Smith", type: CategoryType.OCCUPATION, isAdult: false, order: 1150 },
    { slug: "occ-healer", name: "Healer", type: CategoryType.OCCUPATION, isAdult: false, order: 1160 },
    { slug: "occ-oracle", name: "Oracle", type: CategoryType.OCCUPATION, isAdult: false, order: 1170 },
    { slug: "occ-smuggler", name: "Smuggler", type: CategoryType.OCCUPATION, isAdult: false, order: 1180 },
    { slug: "occ-bodyguard", name: "Bodyguard", type: CategoryType.OCCUPATION, isAdult: false, order: 1181 },
    { slug: "occ-musician", name: "Musician", type: CategoryType.OCCUPATION, isAdult: false, order: 1182 },
    { slug: "occ-librarian", name: "Librarian", type: CategoryType.OCCUPATION, isAdult: false, order: 1183 },
    { slug: "occ-pilot", name: "Pilot", type: CategoryType.OCCUPATION, isAdult: false, order: 1184 },
    { slug: "occ-necromancer", name: "Necromancer", type: CategoryType.OCCUPATION, isAdult: false, order: 1185 },
    { slug: "occ-detective", name: "Detective", type: CategoryType.OCCUPATION, isAdult: false, order: 1186 },
    { slug: "occ-florist", name: "Florist", type: CategoryType.OCCUPATION, isAdult: false, order: 1187 },
    { slug: "occ-royal", name: "Royal", type: CategoryType.OCCUPATION, isAdult: false, order: 1188 },
    { slug: "occ-android", name: "Android", type: CategoryType.OCCUPATION, isAdult: false, order: 1189 },

    { slug: "set-cafe", name: "Café", type: CategoryType.SETTING, isAdult: false, order: 1200 },
    { slug: "set-bookstore", name: "Bookstore", type: CategoryType.SETTING, isAdult: false, order: 1210 },
    { slug: "set-gym", name: "Gym", type: CategoryType.SETTING, isAdult: false, order: 1220 },
    { slug: "set-kitchen", name: "Kitchen", type: CategoryType.SETTING, isAdult: false, order: 1230 },
    { slug: "set-roadtrip", name: "Road Trip", type: CategoryType.SETTING, isAdult: false, order: 1240 },
    { slug: "set-hike", name: "Hiking Trail", type: CategoryType.SETTING, isAdult: false, order: 1250 },
    { slug: "set-library", name: "Library", type: CategoryType.SETTING, isAdult: false, order: 1260 },
    { slug: "set-diner", name: "Diner", type: CategoryType.SETTING, isAdult: false, order: 1270 },
    { slug: "set-forest", name: "Forest", type: CategoryType.SETTING, isAdult: false, order: 1280 },
    { slug: "set-castle", name: "Castle", type: CategoryType.SETTING, isAdult: false, order: 1290 },
    { slug: "set-spaceport", name: "Spaceport", type: CategoryType.SETTING, isAdult: false, order: 1300 },
    { slug: "set-ruins", name: "Ruins", type: CategoryType.SETTING, isAdult: false, order: 1310 },
    { slug: "set-night-market", name: "Night Market", type: CategoryType.SETTING, isAdult: false, order: 1320 },
    { slug: "set-underworld-club", name: "Underworld Club", type: CategoryType.SETTING, isAdult: false, order: 1330 },
    { slug: "set-city", name: "City", type: CategoryType.SETTING, isAdult: false, order: 1340 },
    { slug: "set-penthouse", name: "Penthouse", type: CategoryType.SETTING, isAdult: false, order: 1350 },
    { slug: "set-concert", name: "Concert Venue", type: CategoryType.SETTING, isAdult: false, order: 1360 },
    { slug: "set-bar", name: "Bar", type: CategoryType.SETTING, isAdult: false, order: 1370 },
    { slug: "set-spaceship", name: "Spaceship", type: CategoryType.SETTING, isAdult: false, order: 1380 },
    { slug: "set-scifi", name: "Sci-Fi City", type: CategoryType.SETTING, isAdult: false, order: 1390 },
    { slug: "set-fantasy", name: "Fantasy Realm", type: CategoryType.SETTING, isAdult: false, order: 1400 },
    { slug: "set-cathedral", name: "Cathedral", type: CategoryType.SETTING, isAdult: false, order: 1410 },
    { slug: "set-office", name: "Office", type: CategoryType.SETTING, isAdult: false, order: 1420 },
    { slug: "set-town", name: "Town", type: CategoryType.SETTING, isAdult: false, order: 1430 },
    { slug: "set-market", name: "Market", type: CategoryType.SETTING, isAdult: false, order: 1440 },
    { slug: "set-cottage", name: "Cottage", type: CategoryType.SETTING, isAdult: false, order: 1450 },

    { slug: "rel-friends", name: "Friends", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1500 },
    { slug: "rel-romantic", name: "Romantic", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1510 },
    { slug: "rel-slowburn", name: "Slow Burn", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1520 },
    { slug: "rel-flirty", name: "Flirty", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1530 },
    { slug: "rel-couple", name: "Couple", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1540 },
    { slug: "rel-rivals", name: "Rivals", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1550 },
    { slug: "rel-found-family", name: "Found Family", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1560 },
    { slug: "rel-guardian", name: "Protective Dynamic", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1570 },
    { slug: "rel-partners", name: "Partners", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1580 },
    { slug: "rel-protective", name: "Protective", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1590 },
    { slug: "rel-strangers", name: "Strangers", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1600 },
    { slug: "rel-intellectual", name: "Intellectual", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1610 },
    { slug: "rel-obsessive", name: "Obsessive", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1620 },
    { slug: "rel-teammates", name: "Teammates", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1630 },
    { slug: "rel-allies", name: "Allies", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1640 },
    { slug: "rel-colleagues", name: "Colleagues", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1650 },
    { slug: "rel-tension", name: "Tension", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1660 },
    { slug: "rel-neighbors", name: "Neighbors", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1670 },
    { slug: "rel-domestic", name: "Domestic", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1680 },
    { slug: "rel-travel", name: "Travel", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1690 },
    { slug: "rel-devotion", name: "Devotion", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1700 },
    { slug: "rel-roommates", name: "Roommates", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1710 },
    { slug: "rel-companions", name: "Companions", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1720 },
];

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

const SPECIES_BY_STYLE = {
    grounded: ["human"] as const,
    fantasy: [
        "human",
        "elf",
        "dark elf",
        "high elf",
        "goblin",
        "witch",
        "warlock",
        "demon",
        "fae",
        "vampire",
        "werewolf",
        "shapeshifter",
        "dragonborn",
        "tiefling",
        "ghost",
        "siren",
        "dryad",
    ] as const,
    scifi: ["human", "alien", "android", "cyborg", "starborn", "void-touched", "construct"] as const,
} as const;

const AESTHETICS = [
    "goth",
    "punk",
    "cyberpunk",
    "dark academia",
    "cottagecore",
    "streetwear",
    "witchy",
    "romantic goth",
    "spacecore",
    "forestcore",
    "royalcore",
    "grunge",
    "arcane chic",
    "battle-worn",
    "celestial",
    "ghostly elegance",
] as const;

const FLEXIBLE_ARCHETYPES: FlexibleArchetype[] = [
    {
        id: "barista",
        label: "Charming Barista",
        kind: "any",
        style: "grounded",
        allowedOccupationSlugs: ["occ-barista", "occ-baker", "occ-writer"],
        allowedSettingSlugs: ["set-cafe", "set-bookstore", "set-town"],
        allowedRelationshipSlugsSafe: ["rel-friends", "rel-flirty", "rel-neighbors"],
        allowedRelationshipSlugsAdult: ["rel-romantic", "rel-flirty", "rel-domestic"],
        safeBaseCategories: ["safe-slice-of-life", "safe-friendship", "safe-flirty", "safe-cozy"],
        adultBaseCategories: ["adult-flirty", "adult-romance", "adult-soft"],
        safeHooks: ["Remembers your order and your stories.", ...SAFE_HOOKS],
        adultHooks: ["A confident flirt with a soft touch.", ...ADULT_HOOKS],
        preferredAesthetics: ["cottagecore", "streetwear"],
    },
    {
        id: "scholar",
        label: "Scholar",
        kind: "any",
        style: "grounded",
        allowedOccupationSlugs: ["occ-writer", "occ-archivist", "occ-librarian", "occ-teacher"],
        allowedSettingSlugs: ["set-library", "set-bookstore", "set-office", "set-town"],
        allowedRelationshipSlugsSafe: ["rel-intellectual", "rel-slowburn", "rel-colleagues"],
        allowedRelationshipSlugsAdult: ["rel-romantic", "rel-obsessive", "rel-tension"],
        safeBaseCategories: ["safe-mystery", "safe-slow-burn", "safe-dark-academia"],
        adultBaseCategories: ["adult-romance", "adult-intense", "adult-slowburn"],
        safeHooks: ["Always seems to know the exact thing you need to hear.", ...SAFE_HOOKS],
        adultHooks: ["Quiet confidence and dangerous patience.", ...ADULT_HOOKS],
        preferredAesthetics: ["dark academia", "goth"],
    },
    {
        id: "guardian",
        label: "Guardian",
        kind: "any",
        style: "grounded",
        allowedOccupationSlugs: ["occ-bodyguard", "occ-detective", "occ-trainer", "occ-bounty-hunter"],
        allowedSettingSlugs: ["set-city", "set-penthouse", "set-diner", "set-office", "set-underworld-club"],
        allowedRelationshipSlugsSafe: ["rel-partners", "rel-guardian", "rel-slowburn"],
        allowedRelationshipSlugsAdult: ["rel-romantic", "rel-protective", "rel-tension"],
        safeBaseCategories: ["safe-protective", "safe-action", "safe-slow-burn"],
        adultBaseCategories: ["adult-protective", "adult-romance", "adult-intense"],
        safeHooks: ["Always notices when you're uncomfortable before anyone else does.", ...SAFE_HOOKS],
        adultHooks: ["Calm voice, careful hands, and watchful devotion.", ...ADULT_HOOKS],
        preferredAesthetics: ["battle-worn", "streetwear"],
    },
    {
        id: "witch",
        label: "Witch",
        kind: "any",
        style: "fantasy",
        allowedOccupationSlugs: ["occ-witch", "occ-healer", "occ-alchemist", "occ-oracle"],
        allowedSettingSlugs: ["set-forest", "set-cottage", "set-night-market", "set-library", "set-castle", "set-fantasy"],
        allowedRelationshipSlugsSafe: ["rel-neighbors", "rel-allies", "rel-slowburn", "rel-friends"],
        allowedRelationshipSlugsAdult: ["rel-romantic", "rel-flirty", "rel-devotion"],
        safeBaseCategories: ["safe-fantasy", "safe-supernatural", "safe-witchy", "safe-mystery"],
        adultBaseCategories: ["adult-fantasy", "adult-supernatural", "adult-romance"],
        safeHooks: ["Knows more than they say and cares more than they show.", ...SAFE_HOOKS],
        adultHooks: ["Magnetic, teasing, and deeply attentive.", ...ADULT_HOOKS],
        preferredSpecies: ["human", "witch", "fae", "dark elf"],
        preferredAesthetics: ["witchy", "cottagecore", "dark academia", "romantic goth"],
    },
    {
        id: "rogue",
        label: "Rogue",
        kind: "any",
        style: "fantasy",
        allowedOccupationSlugs: ["occ-smuggler", "occ-bounty-hunter", "occ-rune-smith", "occ-photographer"],
        allowedSettingSlugs: ["set-night-market", "set-ruins", "set-castle", "set-fantasy", "set-city"],
        allowedRelationshipSlugsSafe: ["rel-rivals", "rel-friends", "rel-found-family", "rel-allies"],
        allowedRelationshipSlugsAdult: ["rel-flirty", "rel-romantic", "rel-tension"],
        safeBaseCategories: ["safe-fantasy", "safe-chaotic", "safe-adventure"],
        adultBaseCategories: ["adult-fantasy", "adult-chaotic", "adult-dangerous"],
        safeHooks: ["Fast hands, sharp wit, and a habit of helping when it matters.", ...SAFE_HOOKS],
        adultHooks: ["Swagger, mischief, and hidden softness.", ...ADULT_HOOKS],
        preferredSpecies: ["human", "goblin", "shapeshifter", "fae"],
        preferredAesthetics: ["punk", "arcane chic", "battle-worn"],
    },
    {
        id: "alien",
        label: "Alien",
        kind: "any",
        style: "scifi",
        allowedOccupationSlugs: ["occ-pilot", "occ-starship-pilot", "occ-engineer", "occ-smuggler", "occ-designer", "occ-android"],
        allowedSettingSlugs: ["set-spaceport", "set-spaceship", "set-scifi", "set-city", "set-night-market"],
        allowedRelationshipSlugsSafe: ["rel-friends", "rel-teammates", "rel-companions", "rel-rivals"],
        allowedRelationshipSlugsAdult: ["rel-romantic", "rel-flirty", "rel-tension"],
        safeBaseCategories: ["safe-sci-fi", "safe-adventure", "safe-mystery"],
        adultBaseCategories: ["adult-sci-fi", "adult-romance", "adult-flirty"],
        safeHooks: ["Dry humor, sharp instincts, unexpectedly loyal.", ...SAFE_HOOKS],
        adultHooks: ["Cool confidence with deliberate restraint.", ...ADULT_HOOKS],
        preferredSpecies: ["alien", "starborn", "void-touched", "cyborg"],
        preferredAesthetics: ["cyberpunk", "spacecore", "celestial"],
    },
    {
        id: "android",
        label: "Android",
        kind: "any",
        style: "scifi",
        allowedOccupationSlugs: ["occ-android", "occ-engineer", "occ-designer", "occ-archivist"],
        allowedSettingSlugs: ["set-scifi", "set-city", "set-office", "set-spaceship"],
        allowedRelationshipSlugsSafe: ["rel-roommates", "rel-companions", "rel-colleagues"],
        allowedRelationshipSlugsAdult: ["rel-romantic", "rel-devotion", "rel-obsessive"],
        safeBaseCategories: ["safe-sci-fi", "safe-emotional", "safe-found-family"],
        adultBaseCategories: ["adult-romance", "adult-intense", "adult-slowburn"],
        safeHooks: ["Asks startlingly sincere questions about being human.", ...SAFE_HOOKS],
        adultHooks: ["Focused attention that becomes deeply personal.", ...ADULT_HOOKS],
        preferredSpecies: ["android", "construct", "cyborg"],
        preferredAesthetics: ["cyberpunk", "spacecore"],
    },
];

function buildCategoryMaps(categories: readonly CategorySeed[]) {
    const bySlug = new Map<string, CategorySeed>();
    const nameBySlug = new Map<string, string>();
    for (const category of categories) {
        bySlug.set(category.slug, category);
        nameBySlug.set(category.slug, category.name);
    }
    return { bySlug, nameBySlug };
}

function ensureSlugsExist(slugs: readonly string[], categoryBySlug: Map<string, CategorySeed>) {
    const missing = uniqueStrings(slugs).filter((slug) => !categoryBySlug.has(slug));
    if (missing.length > 0) {
        throw new Error(`Missing category slugs: ${missing.join(", ")}`);
    }
}

function validateFlexibleArchetypes(
    archetypes: readonly FlexibleArchetype[],
    categoryBySlug: Map<string, CategorySeed>,
) {
    for (const archetype of archetypes) {
        ensureSlugsExist(archetype.allowedOccupationSlugs, categoryBySlug);
        ensureSlugsExist(archetype.allowedSettingSlugs, categoryBySlug);
        ensureSlugsExist(archetype.allowedRelationshipSlugsSafe, categoryBySlug);
        ensureSlugsExist(archetype.allowedRelationshipSlugsAdult, categoryBySlug);
        ensureSlugsExist(archetype.safeBaseCategories, categoryBySlug);
        ensureSlugsExist(archetype.adultBaseCategories, categoryBySlug);
    }
}

function resolveCategoryNames(slugs: readonly string[], categoryNameBySlug: Map<string, string>) {
    return slugs
        .map((slug) => categoryNameBySlug.get(slug))
        .filter((value): value is string => Boolean(value));
}

function pickPool<T>(rng: Rng, values: readonly T[] | undefined, fallback: readonly T[]) {
    const pool = values && values.length > 0 ? values : fallback;
    return pick(rng, pool);
}

function generateProfile(
    rng: Rng,
    archetype: FlexibleArchetype,
    isAdult: boolean,
    categoryNameBySlug: Map<string, string>,
): GeneratedProfile {
    const occupationCount = rngInt(rng, 1, Math.min(2, archetype.allowedOccupationSlugs.length));
    const settingCount = rngInt(rng, 1, Math.min(2, archetype.allowedSettingSlugs.length));
    const relationshipCount = rngInt(
        rng,
        1,
        Math.min(2, isAdult ? archetype.allowedRelationshipSlugsAdult.length : archetype.allowedRelationshipSlugsSafe.length),
    );

    const occupationSlugs = pickUnique(rng, archetype.allowedOccupationSlugs, occupationCount);
    const settingSlugs = pickUnique(rng, archetype.allowedSettingSlugs, settingCount);
    const relationshipSlugs = pickUnique(
        rng,
        isAdult ? archetype.allowedRelationshipSlugsAdult : archetype.allowedRelationshipSlugsSafe,
        relationshipCount,
    );

    const baseCategories = isAdult ? archetype.adultBaseCategories : archetype.safeBaseCategories;
    const extraCategoryPool = isAdult
        ? ["adult-flirty", "adult-romance", "adult-intense", "adult-slowburn", "adult-protective", "adult-chaotic"]
        : ["safe-flirty", "safe-slow-burn", "safe-comedy", "safe-mystery", "safe-protective", "safe-cozy"];
    const extraCategories = pickUnique(rng, extraCategoryPool, rngInt(rng, 1, 2));

    const categorySlugs = uniqueStrings([
        ...baseCategories,
        ...occupationSlugs,
        ...settingSlugs,
        ...relationshipSlugs,
        ...extraCategories,
    ]);

    const species = pickPool(rng, archetype.preferredSpecies, SPECIES_BY_STYLE[archetype.style]);
    const aesthetic = pickPool(rng, archetype.preferredAesthetics, AESTHETICS);
    const safeHook = pick(rng, archetype.safeHooks);
    const adultHook = pick(rng, archetype.adultHooks);

    return {
        archetypeId: archetype.id,
        archetypeLabel: archetype.label,
        kind: archetype.kind,
        style: archetype.style,
        occupationSlugs,
        settingSlugs,
        relationshipSlugs,
        categorySlugs,
        species,
        aesthetic,
        safeHook,
        adultHook,
        occupationNames: resolveCategoryNames(occupationSlugs, categoryNameBySlug),
        settingNames: resolveCategoryNames(settingSlugs, categoryNameBySlug),
        relationshipNames: resolveCategoryNames(relationshipSlugs, categoryNameBySlug),
    };
}

function buildCompanionTitle(profile: GeneratedProfile) {
    const occupation = profile.occupationNames[0] ?? profile.archetypeLabel;
    const setting = profile.settingNames[0] ?? "Unknown";
    const speciesPrefix = profile.species === "human" ? "" : `${titleCase(profile.species)} `;
    return `${speciesPrefix}${occupation} of ${setting}`;
}

function buildCompanionSummary(profile: GeneratedProfile, isAdult: boolean) {
    const hook = isAdult ? profile.adultHook : profile.safeHook;
    const roles = profile.occupationNames.join(" / ");
    const settings = profile.settingNames.join(", ");
    const dynamics = profile.relationshipNames.join(", ");
    return `${hook} ${titleCase(profile.species)} ${profile.archetypeLabel.toLowerCase()} with a ${profile.aesthetic} vibe. Roles: ${roles}. Settings: ${settings}. Dynamics: ${dynamics}.`;
}

async function main() {
    const isAdult = parseBool(process.env.SEED_ADULT, false);
    const visibility = parseVisibility(process.env.SEED_VISIBILITY, Visibility.PUBLIC);

    const { bySlug: categoryBySlug, nameBySlug: categoryNameBySlug } = buildCategoryMaps(CATEGORIES);
    validateFlexibleArchetypes(FLEXIBLE_ARCHETYPES, categoryBySlug);

    const seed = process.env.SEED ?? "companions";
    const rng = mulberry32(hash32(seed));

    const generated = FLEXIBLE_ARCHETYPES.map((archetype) =>
        generateProfile(rng, archetype, isAdult, categoryNameBySlug),
    );

    for (const profile of generated) {
        const name = buildCompanionTitle(profile);
        const slug = slugify(name);
        const summary = buildCompanionSummary(profile, isAdult);

        console.log({
            slug,
            name,
            summary,
            archetype: profile.archetypeId,
            species: profile.species,
            aesthetic: profile.aesthetic,
            occupationSlugs: profile.occupationSlugs,
            settingSlugs: profile.settingSlugs,
            relationshipSlugs: profile.relationshipSlugs,
            categorySlugs: profile.categorySlugs,
            visibility,
            contentRating: isAdult ? ContentRating.ADULT : ContentRating.SAFE,
        });
    }
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
