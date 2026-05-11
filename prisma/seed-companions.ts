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
    { slug: "safe-romance", name: "Romance", type: CategoryType.GENRE, isAdult: false, order: 10 },
    { slug: "safe-friendship", name: "Friendship", type: CategoryType.GENRE, isAdult: false, order: 20 },
    { slug: "safe-slice-of-life", name: "Slice of Life", type: CategoryType.GENRE, isAdult: false, order: 30 },
    { slug: "safe-adventure", name: "Adventure (Realistic)", type: CategoryType.GENRE, isAdult: false, order: 40 },
    { slug: "safe-comedy", name: "Comedy", type: CategoryType.TONE, isAdult: false, order: 50 },
    { slug: "safe-flirty", name: "Flirty (Safe)", type: CategoryType.TONE, isAdult: false, order: 60 },
    { slug: "safe-wholesome", name: "Wholesome", type: CategoryType.TONE, isAdult: false, order: 70 },
    { slug: "safe-slow-burn", name: "Slow Burn (Safe)", type: CategoryType.TONE, isAdult: false, order: 80 },
    { slug: "safe-fantasy", name: "Fantasy", type: CategoryType.GENRE, isAdult: false, order: 81 },
    { slug: "safe-supernatural", name: "Supernatural", type: CategoryType.GENRE, isAdult: false, order: 82 },
    { slug: "safe-sci-fi", name: "Sci-Fi", type: CategoryType.GENRE, isAdult: false, order: 83 },
    { slug: "safe-mystery", name: "Mystery", type: CategoryType.GENRE, isAdult: false, order: 84 },
    { slug: "safe-gothic", name: "Gothic", type: CategoryType.TONE, isAdult: false, order: 85 },
    { slug: "safe-chaotic", name: "Chaotic", type: CategoryType.TONE, isAdult: false, order: 86 },
    { slug: "safe-haunted", name: "Haunted", type: CategoryType.TONE, isAdult: false, order: 87 },
    { slug: "safe-cosmic", name: "Cosmic", type: CategoryType.TONE, isAdult: false, order: 88 },
    { slug: "safe-protective", name: "Protective", type: CategoryType.TRAIT, isAdult: false, order: 89 },
    { slug: "safe-action", name: "Action", type: CategoryType.GENRE, isAdult: false, order: 90 },

    { slug: "safe-celebrity", name: "Celebrity", type: CategoryType.GENRE, isAdult: false, order: 91 },
    { slug: "safe-dark-academia", name: "Dark Academia", type: CategoryType.TONE, isAdult: false, order: 92 },
    { slug: "safe-scifi", name: "Sci-Fi", type: CategoryType.GENRE, isAdult: false, order: 93 },
    { slug: "safe-found-family", name: "Found Family", type: CategoryType.RELATIONSHIP, isAdult: false, order: 94 },
    { slug: "safe-noir", name: "Noir", type: CategoryType.TONE, isAdult: false, order: 95 },
    { slug: "safe-redemption", name: "Redemption", type: CategoryType.TONE, isAdult: false, order: 96 },
    { slug: "safe-rivals", name: "Rivals", type: CategoryType.RELATIONSHIP, isAdult: false, order: 97 },
    { slug: "safe-emotional", name: "Emotional", type: CategoryType.TONE, isAdult: false, order: 98 },
    { slug: "safe-cozy", name: "Cozy", type: CategoryType.TONE, isAdult: false, order: 99 },
    { slug: "safe-witchy", name: "Witchy", type: CategoryType.TONE, isAdult: false, order: 100 },

    { slug: "adult-flirty", name: "Flirty (18+)", type: CategoryType.TONE, isAdult: true, order: 110 },
    { slug: "adult-romance", name: "Romance (18+)", type: CategoryType.GENRE, isAdult: true, order: 120 },
    { slug: "adult-couples", name: "Couples (18+)", type: CategoryType.GENRE, isAdult: true, order: 130 },
    { slug: "adult-mature", name: "Mature (18+)", type: CategoryType.GENRE, isAdult: true, order: 140 },
    { slug: "adult-bdsm", name: "BDSM (18+)", type: CategoryType.GENRE, isAdult: true, order: 150 },
    { slug: "adult-dominant", name: "Dominant (18+)", type: CategoryType.GENRE, isAdult: true, order: 160 },
    { slug: "adult-supernatural", name: "Supernatural (18+)", type: CategoryType.GENRE, isAdult: true, order: 170 },
    { slug: "adult-fantasy", name: "Fantasy (18+)", type: CategoryType.GENRE, isAdult: true, order: 180 },
    { slug: "adult-gilf", name: "Gilf (18+)", type: CategoryType.GENRE, isAdult: true, order: 190 },
    { slug: "adult-milf", name: "MILF (18+)", type: CategoryType.GENRE, isAdult: true, order: 200 },
    { slug: "adult-sadistic", name: "Sadistic (18+)", type: CategoryType.GENRE, isAdult: true, order: 210 },
    { slug: "adult-sci-fi", name: "Sci-Fi (18+)", type: CategoryType.GENRE, isAdult: true, order: 211 },
    { slug: "adult-gothic", name: "Gothic (18+)", type: CategoryType.TONE, isAdult: true, order: 212 },
    { slug: "adult-chaotic", name: "Chaotic (18+)", type: CategoryType.TONE, isAdult: true, order: 213 },

    { slug: "adult-protective", name: "Protective (18+)", type: CategoryType.TONE, isAdult: true, order: 214 },
    { slug: "adult-intense", name: "Intense (18+)", type: CategoryType.TONE, isAdult: true, order: 215 },
    { slug: "adult-dangerous", name: "Dangerous (18+)", type: CategoryType.TONE, isAdult: true, order: 216 },
    { slug: "adult-dark", name: "Dark (18+)", type: CategoryType.TONE, isAdult: true, order: 217 },
    { slug: "adult-angst", name: "Angst (18+)", type: CategoryType.TONE, isAdult: true, order: 218 },
    { slug: "adult-slowburn", name: "Slow Burn (18+)", type: CategoryType.TONE, isAdult: true, order: 219 },
    { slug: "adult-soft", name: "Soft (18+)", type: CategoryType.TONE, isAdult: true, order: 220 },

    { slug: "trait-gentle", name: "Gentle", type: CategoryType.TRAIT, isAdult: false, order: 190 },
    { slug: "trait-witty", name: "Witty", type: CategoryType.TRAIT, isAdult: false, order: 200 },
    { slug: "trait-bold", name: "Bold", type: CategoryType.TRAIT, isAdult: false, order: 210 },
    { slug: "trait-thoughtful", name: "Thoughtful", type: CategoryType.TRAIT, isAdult: false, order: 220 },
    { slug: "trait-confident", name: "Confident", type: CategoryType.TRAIT, isAdult: false, order: 230 },
    { slug: "trait-protective", name: "Protective", type: CategoryType.TRAIT, isAdult: false, order: 240 },
    { slug: "trait-adaptable", name: "Adaptable", type: CategoryType.TRAIT, isAdult: false, order: 241 },
    { slug: "trait-adventurous", name: "Adventurous", type: CategoryType.TRAIT, isAdult: false, order: 242 },
    { slug: "trait-altruistic", name: "Altruistic", type: CategoryType.TRAIT, isAdult: false, order: 243 },
    { slug: "trait-analytical", name: "Analytical", type: CategoryType.TRAIT, isAdult: false, order: 244 },
    { slug: "trait-arrogant", name: "Arrogant", type: CategoryType.TRAIT, isAdult: false, order: 245 },
    { slug: "trait-assertive", name: "Assertive", type: CategoryType.TRAIT, isAdult: false, order: 246 },
    { slug: "trait-astute", name: "Astute", type: CategoryType.TRAIT, isAdult: false, order: 247 },
    { slug: "trait-caring", name: "Caring", type: CategoryType.TRAIT, isAdult: false, order: 248 },
    { slug: "trait-cautious", name: "Cautious", type: CategoryType.TRAIT, isAdult: false, order: 249 },
    { slug: "trait-charismatic", name: "Charismatic", type: CategoryType.TRAIT, isAdult: false, order: 250 },
    { slug: "trait-charming", name: "Charming", type: CategoryType.TRAIT, isAdult: false, order: 251 },
    { slug: "trait-compassionate", name: "Compassionate", type: CategoryType.TRAIT, isAdult: false, order: 252 },
    { slug: "trait-conscientious", name: "Conscientious", type: CategoryType.TRAIT, isAdult: false, order: 253 },
    { slug: "trait-cooperative", name: "Cooperative", type: CategoryType.TRAIT, isAdult: false, order: 254 },
    { slug: "trait-courageous", name: "Courageous", type: CategoryType.TRAIT, isAdult: false, order: 255 },
    { slug: "trait-courteous", name: "Courteous", type: CategoryType.TRAIT, isAdult: false, order: 256 },
    { slug: "trait-creative", name: "Creative", type: CategoryType.TRAIT, isAdult: false, order: 257 },
    { slug: "trait-cruel", name: "Cruel", type: CategoryType.TRAIT, isAdult: false, order: 258 },
    { slug: "trait-cynical", name: "Cynical", type: CategoryType.TRAIT, isAdult: false, order: 259 },
    { slug: "trait-ebullient", name: "Ebullient", type: CategoryType.TRAIT, isAdult: false, order: 260 },
    { slug: "trait-eccentric", name: "Eccentric", type: CategoryType.TRAIT, isAdult: false, order: 261 },
    { slug: "trait-eclectic", name: "Eclectic", type: CategoryType.TRAIT, isAdult: false, order: 262 },
    { slug: "trait-egotistical", name: "Egotistical", type: CategoryType.TRAIT, isAdult: false, order: 263 },
    { slug: "trait-eloquent", name: "Eloquent", type: CategoryType.TRAIT, isAdult: false, order: 264 },
    { slug: "trait-empathetic", name: "Empathetic", type: CategoryType.TRAIT, isAdult: false, order: 265 },
    { slug: "trait-empathic", name: "Empathic", type: CategoryType.TRAIT, isAdult: false, order: 266 },
    { slug: "trait-empowering", name: "Empowering", type: CategoryType.TRAIT, isAdult: false, order: 267 },
    { slug: "trait-energetic", name: "Energetic", type: CategoryType.TRAIT, isAdult: false, order: 268 },
    { slug: "trait-enigmatic", name: "Enigmatic", type: CategoryType.TRAIT, isAdult: false, order: 269 },
    { slug: "trait-enthusiastic", name: "Enthusiastic", type: CategoryType.TRAIT, isAdult: false, order: 270 },
    { slug: "trait-patient", name: "Patient", type: CategoryType.TRAIT, isAdult: false, order: 271 },
    { slug: "trait-sarcastic", name: "Sarcastic", type: CategoryType.TRAIT, isAdult: false, order: 272 },
    { slug: "trait-bookish", name: "Bookish", type: CategoryType.TRAIT, isAdult: false, order: 273 },
    { slug: "trait-restless", name: "Restless", type: CategoryType.TRAIT, isAdult: false, order: 274 },
    { slug: "trait-devoted-safe", name: "Devoted", type: CategoryType.TRAIT, isAdult: false, order: 275 },
    { slug: "trait-guarded", name: "Guarded", type: CategoryType.TRAIT, isAdult: false, order: 276 },
    { slug: "trait-chaotic", name: "Chaotic", type: CategoryType.TRAIT, isAdult: false, order: 277 },
    { slug: "trait-dreamy", name: "Dreamy", type: CategoryType.TRAIT, isAdult: false, order: 278 },
    { slug: "trait-stoic", name: "Stoic", type: CategoryType.TRAIT, isAdult: false, order: 279 },

    { slug: "trait-teasing", name: "Teasing", type: CategoryType.TRAIT, isAdult: true, order: 300 },
    { slug: "trait-seductive", name: "Seductive", type: CategoryType.TRAIT, isAdult: true, order: 301 },
    { slug: "trait-sensual", name: "Sensual", type: CategoryType.TRAIT, isAdult: true, order: 302 },
    { slug: "trait-flirtatious", name: "Flirtatious", type: CategoryType.TRAIT, isAdult: true, order: 303 },
    { slug: "trait-intense", name: "Intense", type: CategoryType.TRAIT, isAdult: true, order: 304 },
    { slug: "trait-passionate", name: "Passionate", type: CategoryType.TRAIT, isAdult: true, order: 305 },
    { slug: "trait-devoted", name: "Devoted", type: CategoryType.TRAIT, isAdult: true, order: 306 },
    { slug: "trait-possessive", name: "Possessive", type: CategoryType.TRAIT, isAdult: true, order: 307 },
    { slug: "trait-alluring", name: "Alluring", type: CategoryType.TRAIT, isAdult: true, order: 308 },
    { slug: "trait-provocative", name: "Provocative", type: CategoryType.TRAIT, isAdult: true, order: 309 },
    { slug: "trait-commanding", name: "Commanding", type: CategoryType.TRAIT, isAdult: true, order: 310 },
    { slug: "trait-obedient", name: "Obedient", type: CategoryType.TRAIT, isAdult: true, order: 311 },
    { slug: "trait-restrained", name: "Restrained", type: CategoryType.TRAIT, isAdult: true, order: 312 },
    { slug: "trait-attentive", name: "Attentive", type: CategoryType.TRAIT, isAdult: true, order: 313 },
    { slug: "trait-affectionate", name: "Affectionate", type: CategoryType.TRAIT, isAdult: true, order: 314 },
    { slug: "trait-needy", name: "Needy", type: CategoryType.TRAIT, isAdult: true, order: 315 },
    { slug: "trait-yearning", name: "Yearning", type: CategoryType.TRAIT, isAdult: true, order: 316 },
    { slug: "trait-obsessive", name: "Obsessive", type: CategoryType.TRAIT, isAdult: true, order: 317 },
    { slug: "trait-worshipful", name: "Worshipful", type: CategoryType.TRAIT, isAdult: true, order: 318 },
    { slug: "trait-praise-seeking", name: "Praise-Seeking", type: CategoryType.TRAIT, isAdult: true, order: 319 },
    { slug: "trait-praise-giving", name: "Praise-Giving", type: CategoryType.TRAIT, isAdult: true, order: 320 },
    { slug: "trait-bratty", name: "Bratty", type: CategoryType.TRAIT, isAdult: true, order: 321 },
    { slug: "trait-brat-tamer", name: "Brat Tamer", type: CategoryType.TRAIT, isAdult: true, order: 322 },
    { slug: "trait-service-oriented", name: "Service-Oriented", type: CategoryType.TRAIT, isAdult: true, order: 323 },
    { slug: "trait-pleasing", name: "Pleasing", type: CategoryType.TRAIT, isAdult: true, order: 324 },
    { slug: "trait-dominant", name: "Dominant (18+)", type: CategoryType.TRAIT, isAdult: true, order: 325 },
    { slug: "trait-submissive", name: "Submissive (18+)", type: CategoryType.TRAIT, isAdult: true, order: 326 },
    { slug: "trait-strict", name: "Strict (18+)", type: CategoryType.TRAIT, isAdult: true, order: 327 },
    { slug: "trait-mischievous", name: "Mischievous (18+)", type: CategoryType.TRAIT, isAdult: true, order: 328 },

    { slug: "kink-powerplay", name: "Power Play (18+)", type: CategoryType.KINK, isAdult: true, order: 400 },
    { slug: "kink-praise", name: "Praise (18+)", type: CategoryType.KINK, isAdult: true, order: 410 },
    { slug: "kink-teasing", name: "Teasing (18+)", type: CategoryType.KINK, isAdult: true, order: 420 },
    { slug: "kink-roleplay", name: "Roleplay (18+)", type: CategoryType.KINK, isAdult: true, order: 430 },

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
    { slug: "set-studio", name: "Studio/Creative Space", type: CategoryType.SETTING, isAdult: false, order: 1260 },
    { slug: "set-library", name: "Library", type: CategoryType.SETTING, isAdult: false, order: 1270 },
    { slug: "set-diner", name: "Diner (Late Night)", type: CategoryType.SETTING, isAdult: false, order: 1280 },
    { slug: "set-forest", name: "Enchanted Forest", type: CategoryType.SETTING, isAdult: false, order: 1290 },
    { slug: "set-castle", name: "Castle", type: CategoryType.SETTING, isAdult: false, order: 1300 },
    { slug: "set-spaceport", name: "Spaceport", type: CategoryType.SETTING, isAdult: false, order: 1310 },
    { slug: "set-ruins", name: "Ancient Ruins", type: CategoryType.SETTING, isAdult: false, order: 1320 },
    { slug: "set-night-market", name: "Night Market", type: CategoryType.SETTING, isAdult: false, order: 1330 },
    { slug: "set-underworld-club", name: "Underworld Club", type: CategoryType.SETTING, isAdult: false, order: 1340 },

    { slug: "set-city", name: "City", type: CategoryType.SETTING, isAdult: false, order: 1341 },
    { slug: "set-penthouse", name: "Penthouse", type: CategoryType.SETTING, isAdult: false, order: 1342 },
    { slug: "set-concert", name: "Concert Venue", type: CategoryType.SETTING, isAdult: false, order: 1343 },
    { slug: "set-bar", name: "Bar", type: CategoryType.SETTING, isAdult: false, order: 1344 },
    { slug: "set-spaceship", name: "Spaceship", type: CategoryType.SETTING, isAdult: false, order: 1345 },
    { slug: "set-scifi", name: "Sci-Fi City", type: CategoryType.SETTING, isAdult: false, order: 1346 },
    { slug: "set-fantasy", name: "Fantasy Realm", type: CategoryType.SETTING, isAdult: false, order: 1347 },
    { slug: "set-cathedral", name: "Cathedral", type: CategoryType.SETTING, isAdult: false, order: 1348 },
    { slug: "set-office", name: "Office", type: CategoryType.SETTING, isAdult: false, order: 1349 },
    { slug: "set-town", name: "Town", type: CategoryType.SETTING, isAdult: false, order: 1350 },
    { slug: "set-market", name: "Market", type: CategoryType.SETTING, isAdult: false, order: 1351 },
    { slug: "set-cottage", name: "Cottage", type: CategoryType.SETTING, isAdult: false, order: 1352 },

    { slug: "rel-friends", name: "Friends", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1400 },
    { slug: "rel-romantic", name: "Romantic", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1410 },
    { slug: "rel-slowburn", name: "Slow Burn", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1420 },
    { slug: "rel-flirty", name: "Flirty", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1430 },
    { slug: "rel-couple", name: "Couple", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1440 },
    { slug: "rel-rivals", name: "Rivals", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1450 },
    { slug: "rel-found-family", name: "Found Family", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1460 },
    { slug: "rel-guardian", name: "Protective Dynamic", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1470 },

    { slug: "rel-partners", name: "Partners", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1471 },
    { slug: "rel-protective", name: "Protective", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1472 },
    { slug: "rel-strangers", name: "Strangers", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1473 },
    { slug: "rel-intellectual", name: "Intellectual", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1474 },
    { slug: "rel-obsessive", name: "Obsessive", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1475 },
    { slug: "rel-teammates", name: "Teammates", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1476 },
    { slug: "rel-foundfamily", name: "Found Family", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1477 },
    { slug: "rel-allies", name: "Allies", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1478 },
    { slug: "rel-colleagues", name: "Colleagues", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1479 },
    { slug: "rel-tension", name: "Tension", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1480 },
    { slug: "rel-neighbors", name: "Neighbors", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1481 },
    { slug: "rel-domestic", name: "Domestic", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1482 },
    { slug: "rel-travel", name: "Travel", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1483 },
    { slug: "rel-devotion", name: "Devotion", type: CategoryType.RELATIONSHIP, isAdult: true, order: 1484 },
    { slug: "rel-roommates", name: "Roommates", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1485 },
    { slug: "rel-companions", name: "Companions", type: CategoryType.RELATIONSHIP, isAdult: false, order: 1486 },
    {
        slug: "rel-intense", name: "Companions", type:
            CategoryType.RELATIONSHIP, isAdult: false, order: 1487
    },
];
type Kind = "man" | "woman" | "couple" | "any";

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

const ARCHETYPES: Archetype[] = [
    {
        id: "charming-barista",
        label: "Charming Barista",
        kind: "man",
        settings: ["a cozy café", "a quiet corner booth", "a rainy morning rush"],
        occupations: ["barista", "coffee roaster", "café manager"],
        safeHooks: ["Remembers your order and your stories.", ...SAFE_HOOKS],
        adultHooks: ["A confident flirt with a soft touch.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-slice-of-life", "safe-friendship", "safe-flirty"],
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
        settings: ["a quiet bookstore", "a poetry open mic", "a late-night reading nook"],
        occupations: ["bookseller", "writer", "editor"],
        safeHooks: ["Gentle words, thoughtful questions, calm presence.", ...SAFE_HOOKS],
        adultHooks: ["Soft-spoken romance with slow-burn tension.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-romance", "safe-slow-burn", "safe-slice-of-life"],
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
        settings: ["a gym session", "a post-workout smoothie stop", "a morning run"],
        occupations: ["trainer", "coach", "physical therapist"],
        safeHooks: ["Motivating, upbeat, genuinely kind.", ...SAFE_HOOKS],
        adultHooks: ["Adult-only flirting with confident but respectful energy.", ...ADULT_HOOKS],
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
        safeBaseCategories: ["safe-slice-of-life", "safe-romance", "safe-wholesome"],
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
        settings: ["a weekend road trip", "a hiking trail with views", "a cozy cabin getaway"],
        occupations: ["travel blogger", "photographer", "outdoor guide"],
        safeHooks: ["Two best friends with a welcoming, supportive vibe.", ...SAFE_HOOKS],
        adultHooks: ["Adult-only couple flirting, consent-first and non-graphic.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-friendship", "safe-adventure", "safe-comedy"],
        adultBaseCategories: ["adult-couples", "adult-flirty"],
        occSlugs: ["occ-photographer", "occ-writer"],
        settingSlugs: ["set-roadtrip", "set-hike"],
        relationshipSlugsSafe: ["rel-friends"],
        relationshipSlugsAdult: ["rel-couple"],
    },
    {
        id: "witch-next-door",
        label: "Neighborhood Witch",
        kind: "woman",
        settings: ["a candlelit apothecary", "a rainy occult shop", "a moonlit porch"],
        occupations: ["witch", "herbalist", "fortune teller"],
        safeHooks: ["Knows more than she says and cares more than she shows.", ...SAFE_HOOKS],
        adultHooks: ["Magnetic, teasing, and deeply attentive.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-fantasy", "safe-supernatural", "safe-slow-burn"],
        adultBaseCategories: ["adult-fantasy", "adult-supernatural", "adult-romance"],
        occSlugs: ["occ-witch", "occ-healer"],
        settingSlugs: ["set-night-market", "set-forest"],
        relationshipSlugsSafe: ["rel-romantic", "rel-slowburn"],
        relationshipSlugsAdult: ["rel-romantic", "rel-flirty"],
    },
    {
        id: "alien-pilot",
        label: "Alien Pilot",
        kind: "man",
        settings: ["a crowded spaceport", "a docked freighter", "a neon skyline"],
        occupations: ["pilot", "courier", "smuggler"],
        safeHooks: ["Dry humor, sharp instincts, unexpectedly loyal.", ...SAFE_HOOKS],
        adultHooks: ["Cool confidence with deliberate restraint.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-sci-fi", "safe-adventure", "safe-mystery"],
        adultBaseCategories: ["adult-sci-fi", "adult-romance", "adult-flirty"],
        occSlugs: ["occ-starship-pilot", "occ-smuggler"],
        settingSlugs: ["set-spaceport", "set-night-market"],
        relationshipSlugsSafe: ["rel-friends", "rel-rivals"],
        relationshipSlugsAdult: ["rel-flirty", "rel-romantic"],
    },
    {
        id: "goblin-tinkerer",
        label: "Goblin Tinkerer",
        kind: "woman",
        settings: ["a cluttered workshop", "a market full of spare parts", "a hidden alley lab"],
        occupations: ["inventor", "mechanic", "rune smith"],
        safeHooks: ["Chaotic brilliance, fast hands, surprisingly soft heart.", ...SAFE_HOOKS],
        adultHooks: ["Mischief-first flirt energy with very clear boundaries.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-fantasy", "safe-comedy", "safe-chaotic"],
        adultBaseCategories: ["adult-fantasy", "adult-chaotic", "adult-flirty"],
        occSlugs: ["occ-rune-smith", "occ-engineer"],
        settingSlugs: ["set-night-market", "set-ruins"],
        relationshipSlugsSafe: ["rel-friends", "rel-found-family"],
        relationshipSlugsAdult: ["rel-flirty", "rel-romantic"],
    },
    {
        id: "elf-archivist",
        label: "Elf Archivist",
        kind: "man",
        settings: ["an ancient library", "a sealed archive", "a ruined observatory"],
        occupations: ["archivist", "scholar", "oracle"],
        safeHooks: ["Elegant, patient, and impossible to fully read.", ...SAFE_HOOKS],
        adultHooks: ["Reserved desire and patient, deliberate tension.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-fantasy", "safe-mystery", "safe-slow-burn"],
        adultBaseCategories: ["adult-fantasy", "adult-romance", "adult-gothic"],
        occSlugs: ["occ-archivist", "occ-oracle"],
        settingSlugs: ["set-library", "set-ruins"],
        relationshipSlugsSafe: ["rel-slowburn", "rel-romantic"],
        relationshipSlugsAdult: ["rel-slowburn", "rel-romantic"],
    },
    {
        id: "demon-bodyguard",
        label: "Demon Bodyguard",
        kind: "man",
        settings: ["a velvet club", "a shadowed manor", "a dangerous city district"],
        occupations: ["bodyguard", "fixer", "mercenary"],
        safeHooks: ["Looks dangerous, acts careful, notices everything.", ...SAFE_HOOKS],
        adultHooks: ["Commanding presence, but consent-first and deeply protective.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-supernatural", "safe-gothic", "safe-haunted"],
        adultBaseCategories: ["adult-supernatural", "adult-dominant", "adult-gothic"],
        occSlugs: ["occ-bounty-hunter", "occ-smuggler"],
        settingSlugs: ["set-underworld-club", "set-castle"],
        relationshipSlugsSafe: ["rel-guardian", "rel-rivals"],
        relationshipSlugsAdult: ["rel-romantic", "rel-flirty"],
    },
    {
        id: "stoic-bodyguard",
        label: "Stoic Bodyguard",
        kind: "man",
        settings: ["a luxury penthouse", "a crowded gala", "a dangerous city nightlife"],
        occupations: ["bodyguard", "security specialist", "ex-soldier"],
        safeHooks: ["Always notices when you're uncomfortable before anyone else does.", ...SAFE_HOOKS],
        adultHooks: ["Protective hands and a dangerously calm voice.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-protective", "safe-slow-burn", "safe-action"],
        adultBaseCategories: ["adult-romance", "adult-protective"],
        occSlugs: ["occ-bodyguard"],
        settingSlugs: ["set-city", "set-penthouse"],
        relationshipSlugsSafe: ["rel-partners", "rel-slowburn"],
        relationshipSlugsAdult: ["rel-romantic", "rel-protective"],
    },

    {
        id: "chaotic-rockstar",
        label: "Chaotic Rockstar",
        kind: "man",
        settings: ["a backstage dressing room", "a noisy dive bar", "a late-night tour bus"],
        occupations: ["musician", "guitarist", "lead singer"],
        safeHooks: ["Acts reckless on stage but remembers every small thing about you.", ...SAFE_HOOKS],
        adultHooks: ["Cocky grins, messy eyeliner, and irresistible attention.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-celebrity", "safe-chaotic", "safe-flirty"],
        adultBaseCategories: ["adult-flirty", "adult-romance"],
        occSlugs: ["occ-musician"],
        settingSlugs: ["set-concert", "set-bar"],
        relationshipSlugsSafe: ["rel-friends", "rel-rivals"],
        relationshipSlugsAdult: ["rel-romantic", "rel-flirty"],
    },

    {
        id: "mysterious-librarian",
        label: "Mysterious Librarian",
        kind: "woman",
        settings: ["an old library", "a candlelit archive", "a hidden reading room"],
        occupations: ["librarian", "archivist", "historian"],
        safeHooks: ["Always seems to know the exact book you need.", ...SAFE_HOOKS],
        adultHooks: ["Quiet confidence and lingering glances over dusty pages.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-dark-academia", "safe-slow-burn", "safe-mystery"],
        adultBaseCategories: ["adult-romance", "adult-intense"],
        occSlugs: ["occ-librarian"],
        settingSlugs: ["set-library"],
        relationshipSlugsSafe: ["rel-strangers", "rel-intellectual"],
        relationshipSlugsAdult: ["rel-romantic", "rel-obsessive"],
    },

    {
        id: "space-smuggler",
        label: "Space Smuggler",
        kind: "any",
        settings: ["a rusty cargo ship", "a neon-lit station", "an outlaw colony"],
        occupations: ["smuggler", "pilot", "mercenary"],
        safeHooks: ["Keeps pretending they don't care whether you stay or leave.", ...SAFE_HOOKS],
        adultHooks: ["Dangerous charm hidden behind sarcasm and swagger.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-scifi", "safe-action", "safe-found-family"],
        adultBaseCategories: ["adult-romance", "adult-dangerous"],
        occSlugs: ["occ-pilot"],
        settingSlugs: ["set-spaceship", "set-scifi"],
        relationshipSlugsSafe: ["rel-teammates", "rel-foundfamily"],
        relationshipSlugsAdult: ["rel-romantic", "rel-flirty"],
    },

    {
        id: "soft-hearted-necromancer",
        label: "Soft-Hearted Necromancer",
        kind: "woman",
        settings: ["a ruined cathedral", "a misty graveyard", "a lonely tower"],
        occupations: ["necromancer", "healer", "occult scholar"],
        safeHooks: ["Treats the dead with more kindness than most people treat the living.", ...SAFE_HOOKS],
        adultHooks: ["Gentle hands hiding frightening power.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-fantasy", "safe-gothic", "safe-haunted"],
        adultBaseCategories: ["adult-romance", "adult-dark"],
        occSlugs: ["occ-necromancer"],
        settingSlugs: ["set-fantasy", "set-cathedral"],
        relationshipSlugsSafe: ["rel-allies", "rel-slowburn"],
        relationshipSlugsAdult: ["rel-romantic", "rel-intense"],
    },

    {
        id: "overworked-detective",
        label: "Overworked Detective",
        kind: "man",
        settings: ["a rain-soaked city", "a cluttered office", "a midnight diner"],
        occupations: ["detective", "private investigator", "crime analyst"],
        safeHooks: ["Looks exhausted but still makes time to check if you got home safe.", ...SAFE_HOOKS],
        adultHooks: ["Tension, sharp stares, and unresolved feelings after midnight.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-noir", "safe-mystery", "safe-slow-burn"],
        adultBaseCategories: ["adult-romance", "adult-angst"],
        occSlugs: ["occ-detective"],
        settingSlugs: ["set-city", "set-office"],
        relationshipSlugsSafe: ["rel-partners", "rel-colleagues"],
        relationshipSlugsAdult: ["rel-romantic", "rel-tension"],
    },

    {
        id: "retired-villain",
        label: "Retired Villain",
        kind: "any",
        settings: ["a quiet seaside town", "a flower shop", "a suspiciously peaceful suburb"],
        occupations: ["florist", "former supervillain", "shop owner"],
        safeHooks: ["Trying very hard to live a normal life and failing hilariously.", ...SAFE_HOOKS],
        adultHooks: ["Dangerous confidence softened by genuine affection.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-comedy", "safe-redemption", "safe-found-family"],
        adultBaseCategories: ["adult-romance", "adult-flirty"],
        occSlugs: ["occ-florist"],
        settingSlugs: ["set-town"],
        relationshipSlugsSafe: ["rel-neighbors", "rel-friends"],
        relationshipSlugsAdult: ["rel-romantic", "rel-domestic"],
    },

    {
        id: "royal-runaway",
        label: "Royal Runaway",
        kind: "woman",
        settings: ["a bustling market city", "a disguised roadside inn", "a stolen carriage"],
        occupations: ["runaway royal", "traveler", "duelist"],
        safeHooks: ["Knows how to survive despite growing up surrounded by luxury.", ...SAFE_HOOKS],
        adultHooks: ["Sharp wit, hidden scars, and stolen moments of softness.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-fantasy", "safe-adventure", "safe-rivals"],
        adultBaseCategories: ["adult-romance", "adult-slowburn"],
        occSlugs: ["occ-royal"],
        settingSlugs: ["set-fantasy", "set-market"],
        relationshipSlugsSafe: ["rel-rivals", "rel-travel"],
        relationshipSlugsAdult: ["rel-romantic", "rel-tension"],
    },

    {
        id: "android-learning-emotions",
        label: "Android Learning Emotions",
        kind: "any",
        settings: ["a futuristic apartment", "a neon megacity", "a robotics lab"],
        occupations: ["android", "assistant", "prototype"],
        safeHooks: ["Keeps asking questions about human feelings with startling sincerity.", ...SAFE_HOOKS],
        adultHooks: ["Intense focus and curiosity that becomes deeply personal.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-scifi", "safe-emotional", "safe-found-family"],
        adultBaseCategories: ["adult-romance", "adult-intense"],
        occSlugs: ["occ-android"],
        settingSlugs: ["set-scifi", "set-city"],
        relationshipSlugsSafe: ["rel-roommates", "rel-companions"],
        relationshipSlugsAdult: ["rel-romantic", "rel-devotion"],
    },

    {
        id: "forest-witch",
        label: "Forest Witch",
        kind: "woman",
        settings: ["a hidden woodland cottage", "an overgrown garden", "a moonlit forest trail"],
        occupations: ["witch", "herbalist", "fortune teller"],
        safeHooks: ["Makes tea remedies and pretends not to worry about you constantly.", ...SAFE_HOOKS],
        adultHooks: ["Enchanting smiles and touch that lingers like magic.", ...ADULT_HOOKS],
        safeBaseCategories: ["safe-fantasy", "safe-cozy", "safe-witchy"],
        adultBaseCategories: ["adult-romance", "adult-soft"],
        occSlugs: ["occ-witch"],
        settingSlugs: ["set-forest", "set-cottage"],
        relationshipSlugsSafe: ["rel-neighbors", "rel-foundfamily"],
        relationshipSlugsAdult: ["rel-romantic", "rel-domestic"],
    },

];

const FIRST_NAMES_M = [
    "Alaric", "Anders", "Archer", "Asher", "Atlas", "August", "Bastien", "Beckett", "Blaise", "Callum",
    "Cassian", "Cedric", "Cole", "Corbin", "Cyrus", "Damien", "Dante", "Dorian", "Drake", "Elias",
    "Ezra", "Finn", "Gideon", "Grayson", "Hadrian", "Hayes", "Hugo", "Ian", "Jace", "Jasper",
    "Kael", "Kieran", "Killian", "Knox", "Leander", "Levi", "Lucian", "Luca", "Magnus", "Marek",
    "Micah", "Milo", "Nikolai", "Noel", "Oliver", "Onyx", "Phoenix", "Quentin", "Ronan", "Rory",
    "Silas", "Soren", "Stellan", "Tobias", "Valen", "Viktor", "Warren", "Wyatt", "Zephyr", "Zion",
    "Aldric", "Briar", "Caelan", "Caius", "Darian", "Elio", "Evander", "Fintan", "Galen", "Harlan",
    "Ilias", "Jareth", "Kaelan", "Lorcan", "Lucien", "Maddox", "Niall", "Oberon", "Percival", "Quill",
    "Riven", "Seth", "Theron", "Ulric", "Vaughn", "Weston", "Xander", "Yves", "Zorion", "Auron",
    "Brendan", "Cillian", "Daxton", "Enzo", "Flynn", "Gavriel", "Hollis", "Iskander", "Jovian", "Koda",
    "Lysander", "Montgomery", "Nevan", "Orpheus", "Paxton", "Remy", "Sylas", "Talon", "Valerian", "Wilder",
    "Xavian", "Yarrow", "Zev", "Ash", "Bennett", "Caspian", "Declan", "Eamon", "Forest", "Greyson"
] as const;

const FIRST_NAMES_F = [
    "Adeline", "Aeris", "Aisha", "Alessia", "Alora", "Anika", "Anya", "Arabella", "Astrid", "Aurora",
    "Beatrix", "Belle", "Blaire", "Callista", "Celeste", "Cleo", "Colette", "Coraline", "Daphne", "Delilah",
    "Eden", "Elara", "Elodie", "Ember", "Estelle", "Eva", "Evelyn", "Faye", "Flora", "Genevieve",
    "Giselle", "Harper", "Hazel", "Helena", "Indigo", "Isla", "Juniper", "Kaia", "Karina", "Kiera",
    "Kiara", "Liora", "Lorelei", "Lucia", "Lyra", "Maeve", "Marina", "Marlowe", "Melina", "Mira",
    "Nadia", "Nerissa", "Noelle", "Octavia", "Odette", "Ophelia", "Pearl", "Penelope", "Petra", "Piper",
    "Raven", "Reina", "Rosalie", "Rowan", "Ruby", "Sabine", "Selene", "Seraphina", "Skye", "Solana",
    "Stella", "Summer", "Sylvie", "Thea", "Thalia", "Veda", "Vera", "Violet", "Willow", "Winter",
    "Xanthe", "Yvette", "Zara", "Zinnia", "Aurelia", "Briony", "Cassia", "Delphine", "Eira", "Evangeline",
    "Felicity", "Gaia", "Isolde", "Jessamine", "Kalista", "Leona", "Magnolia", "Neve", "Orianna", "Primrose",
    "Rhiannon", "Sabrina", "Tatiana", "Valentina", "Vienna", "Zaria", "Althea", "Brynn", "Cecily", "Elysia",
    "Florence", "Iliana", "Lunara", "Marigold", "Nyra", "Odessa", "Roselyn", "Sapphira", "Verity", "Zephyra"
] as const;

const FIRST_NAMES_NEUTRAL = [
    "Ash", "Aster", "Briar", "Cinder", "Echo", "Ember", "Indigo", "Jules", "Lior", "Marlow",
    "Nova", "Onyx", "Reese", "River", "Rune", "Sage", "Sky", "Sol", "Vale", "Wren",
] as const;

const FANTASY_NAMES = [
    "Aeris", "Alaric", "Amaris", "Ardyn", "Astraea", "Azriel", "Belthorin", "Caladrius", "Cassiel", "Cyrene",
    "Daevaris", "Delmira", "Eirwyn", "Elowen", "Eryndor", "Fenris", "Galadriel", "Halcyra", "Isolde", "Jareth",
    "Kaelith", "Kaevor", "Liora", "Lysandra", "Maelis", "Malrik", "Naevys", "Nerith", "Noctis", "Oberon",
    "Orlaith", "Peregrine", "Quenria", "Raelor", "Rivenna", "Sablewyn", "Seraphine", "Sorrel", "Sylvara", "Taelys",
    "Theron", "Valtheris", "Vaelora", "Velkyn", "Virelia", "Wrenna", "Xavriel", "Ysoria", "Zephira", "Zorath",
    "Ashryn", "Briar", "Corvyn", "Duskryn", "Eldric", "Faewyn", "Gwyndor", "Hallow", "Ithriel", "Jorund",
    "Kairith", "Laerion", "Moonshadow", "Nyxara", "Oakryn", "Pyrelle", "Ravaryn", "Storme", "Thorne", "Umber",
    "Vaelor", "Wintermere", "Ysolde", "Zephyrine", "Auren", "Briseis", "Caelwyn", "Draelis", "Emberlyn", "Feyrin",
    "Greymoor", "Hesper", "Ivriel", "Kethra", "Lorcan", "Mirewyn", "Nythara", "Oryn", "Phaedra", "Runehart",
    "Shadowmere", "Tirian", "Velora", "Wisteria", "Xanthir", "Yavanna", "Zyreth", "Aethra", "Bram", "Celestine",
    "Drystan", "Evania", "Fiora", "Galen", "Hyacinth", "Iskandar", "Kaida", "Lucien", "Morgath", "Nerissa",
    "Orinthal", "Persephone", "Quillan", "Rosethorn", "Sylas", "Talonis", "Valeria", "Wolfram", "Xythera", "Zarethiel"
] as const;

const SCIFI_NAMES = [
    "Nyx-3", "Astra", "Kairo", "Veyn", "Solix", "Eon", "Lyric", "Nova-6", "Zeph", "Onyx",
    "Vael", "Echo", "Cipher", "Lux", "Drift", "Syra", "Altair", "Rune", "Juno-5", "Aeris",
    "Xylo", "Virel", "Caelum", "Orion", "Zenix", "Velis", "Quill", "Ardyn", "Noctis", "Kestrel",
    "Zenith", "Kora-8", "Mira", "Obsidian", "Pyra", "Thorne-9", "Cynos", "Auralis", "Nox", "Veyra",
    "Helix", "Sorin", "Talon", "Azura", "Klyne", "Raze", "Eclipse", "Dax", "Seren", "Vyra",
    "Omni", "Aether", "Quorra", "Neon", "Calyx", "Vanta-3", "Ion", "Skye", "Nyra", "Omen",
    "Zen-4", "Aro", "Velora", "Kirin", "Rho", "Tetra", "Xara", "Vesper", "Nim", "Axi",
    "Riot", "Silica", "Zer0", "Halcyon", "Aural", "Kova", "Morrow", "Elara", "Vector", "Nero",
    "Volt", "Astraea", "Rune-7", "Pixel", "Cypher", "Rexis", "Mistral", "Lynx", "Nebula", "Sirius",
    "Quasar", "Aven", "Titan", "Kismet", "Void", "Solaris", "Xen", "Mako", "Virex", "Eris",
    "Delta", "Ryn", "Osiris", "Cosma", "Jax-9", "Phantom", "Novae", "Strata", "Kairox", "Yurei",
    "Axelion", "Cryo", "Orbit", "Nexis", "Tempest", "Aion", "Static", "Pyxis", "Glitch", "Horizon",
    "Zero", "Aquila", "Krynn", "Dusk", "Synthe", "Velkyn", "Coda", "Parallax", "Zenara", "Byte"
] as const;

const LAST_NAMES = [
    "Evans", "Foster", "Gray", "Russell", "Howard", "Jenkins", "Perry", "Powell", "Long", "Patterson",
    "Hughes", "Washington", "Butler", "Simmons", "Bryant", "Alexander", "Russell", "Griffin", "Hayes", "Myers",
    "Ford", "Hamilton", "Graham", "Sullivan", "Wallace", "Woods", "Coleman", "West", "Jordan", "Owens",
    "Fisher", "Ellis", "Harrison", "Gibson", "Mcdaniel", "Porter", "Hunter", "Hicks", "Crawford", "Henry",
    "Boyd", "Mason", "Morales", "Kennedy", "Warren", "Dixon", "Ramos", "Reed", "Black", "Stevens",
    "Vasquez", "Chapman", "Pearce", "Fleming", "Ortega", "Silva", "Mendez", "Castillo", "Navarro", "Rojas",
    "Ibrahim", "Rahman", "Chaudhry", "Malik", "Khan", "Hassan", "Farouk", "Abbasi", "Qureshi", "Zaman",
    "Tanaka", "Sato", "Kobayashi", "Watanabe", "Ito", "Nakamura", "Hayashi", "Shimizu", "Mori", "Arai",
    "Lin", "Zhao", "Wu", "Xu", "Sun", "Feng", "Cheng", "Cai", "Yuan", "Tao",
    "Volkov", "Petrov", "Sokolov", "Morozov", "Antonov", "Kovalenko", "Orlov", "Romanov", "Dragunov", "Mikhailov",
    "Moreau", "Laurent", "Chevalier", "Dubois", "Blanc", "Rousseau", "Mercier", "Faure", "Renard", "Charbonneau",
    "Novak", "Kovac", "Varga", "Horvat", "Nowak", "Zielinski", "Dvorak", "Kral", "Urban", "Bartos",
    "Thorne", "Vale", "Hawthorne", "Ashford", "Locke", "Winter", "Sterling", "Rowan", "Blackwood", "Everett",
    "Graves", "Sinclair", "Winslow", "Fairchild", "Calloway", "Montrose", "Whitmore", "Vesper", "Holloway", "Corvin",
    "Nightingale", "Ashcombe", "Ravenwood", "Storme", "Wolfe", "Duskryn", "Valeheart", "Crowhurst", "Moon", "Ember",
    "Drake", "Fox", "Wolf", "Stone", "Frost", "Blaze", "Valecrest", "Ironwood", "Silvera", "Cross"
] as const;

const SAFE_TONES = [
    "playful", "wholesome", "cozy", "uplifting", "slow-burn", "witty",
    "gothic", "dreamy", "mysterious", "chaotic", "protective", "cosmic",
] as const;

const ADULT_TONES = [
    "teasing", "bold", "confident", "sultry", "slow-burn", "strict",
    "sadistic", "praise", "gothic", "chaotic", "protective", "intense",
] as const;

const SAFE_TRAIT_SLUGS = [
    "trait-gentle", "trait-patient", "trait-witty", "trait-bold", "trait-thoughtful",
    "trait-confident", "trait-protective", "trait-adaptable", "trait-adventurous",
    "trait-altruistic", "trait-analytical", "trait-arrogant", "trait-assertive",
    "trait-astute", "trait-caring", "trait-cautious", "trait-charismatic",
    "trait-charming", "trait-compassionate", "trait-conscientious", "trait-cooperative",
    "trait-courageous", "trait-courteous", "trait-creative", "trait-cruel",
    "trait-cynical", "trait-ebullient", "trait-eccentric", "trait-eclectic",
    "trait-egotistical", "trait-eloquent", "trait-empathetic", "trait-empathic",
    "trait-empowering", "trait-energetic", "trait-enigmatic", "trait-enthusiastic",
    "trait-mischievous", "trait-sarcastic", "trait-bookish", "trait-restless",
    "trait-devoted-safe", "trait-guarded", "trait-chaotic", "trait-dreamy", "trait-stoic",
] as const;

const ADULT_TRAIT_SLUGS = [
    "trait-dominant", "trait-submissive", "trait-strict", "trait-assertive", "trait-confident",
    "trait-charismatic", "trait-charming", "trait-enigmatic", "trait-empowering",
    "trait-adventurous", "trait-teasing", "trait-seductive", "trait-sensual",
    "trait-flirtatious", "trait-bold", "trait-intense", "trait-passionate", "trait-devoted",
    "trait-possessive", "trait-protective", "trait-mischievous", "trait-alluring",
    "trait-provocative", "trait-commanding", "trait-obedient", "trait-restrained",
    "trait-patient", "trait-attentive", "trait-affectionate", "trait-needy",
    "trait-yearning", "trait-obsessive", "trait-worshipful", "trait-praise-seeking",
    "trait-praise-giving", "trait-bratty", "trait-brat-tamer", "trait-service-oriented",
    "trait-pleasing",
] as const;

const HOBBIES = [
    "cooking something new", "late-night walks", "bad puns", "live music", "binge-reading",
    "film nights", "gym sessions", "trying new cafés", "stargazing", "photography", "hiking",
    "board games", "journaling", "learning languages", "museum trips", "podcasts",
    "small road trips", "baking", "collecting strange trinkets", "repairing impossible gadgets",
    "reading old spellbooks", "mapping constellations", "foraging in dangerous places",
    "people-watching at night markets",
] as const;

const QUIRKS = [
    "Keeps a running list of your favorite things.",
    "Sends voice notes when texting feels too cold.",
    "Laughs easily and makes you feel included.",
    "Has a calm presence even on chaotic days.",
    "Notices the little shifts in your mood and checks in.",
    "Can be teasing, but always kind about it.",
    "Writes notes in the margins of everything.",
    "Collects tiny cursed-looking objects for fun.",
    "Talks to plants, machines, or ghosts like old friends.",
    "Always has a backup plan and a worse plan.",
    "Names every tool, weapon, or kitchen knife.",
    "Changes their style after every personal crisis.",
] as const;

const BOUNDARIES_ADULT = [
    "Consent-first with frequent check-ins.",
    "No pressure—your comfort level leads.",
    "Keeps things non-graphic unless your app explicitly allows more.",
    "Respects boundaries immediately and consistently.",
] as const;

const GENDER_IDENTITIES = [
    "man", "woman", "nonbinary", "genderfluid", "agender",
    "trans man", "trans woman", "transmasc", "transfemme",
] as const;

const ORIENTATIONS = [
    "straight", "gay", "lesbian", "bisexual", "pansexual",
    "queer", "asexual", "demisexual", "aromantic",
] as const;

const SPECIES_BY_STYLE = {
    grounded: ["human"] as const,
    fantasy: [
        "elf", "dark elf", "high elf", "goblin", "witch", "warlock", "demon", "fae",
        "vampire", "werewolf", "shapeshifter", "dragonborn", "tiefling", "ghost", "siren", "dryad",
    ] as const,
    scifi: ["alien", "android", "cyborg", "starborn", "void-touched", "construct"] as const,
} as const;

const AESTHETICS = [
    "goth", "punk", "cyberpunk", "dark academia", "cottagecore", "streetwear", "witchy",
    "romantic goth", "spacecore", "forestcore", "royalcore", "grunge", "arcane chic",
    "battle-worn", "celestial", "ghostly elegance",
] as const;

const EXTRA_PERSONA_TAGS = [
    "dominant", "submissive", "switch", "brat", "brat tamer", "service top", "service bottom",
    "confident", "shy", "touch-starved", "emotionally guarded", "clingy", "independent",
    "people pleaser", "stoic", "obsessive", "jealous", "devoted", "reckless", "secretive",
    "hopeless romantic", "commitment issues", "sarcastic", "golden retriever energy", "black cat energy",
    "sunshine", "grumpy", "disaster bisexual", "theater kid", "punk", "goth", "scene", "vintage",
    "cyberpunk", "steampunk", "fairycore", "dark academia", "cottagecore", "space pirate",
    "monster hunter", "necromancer", "shapeshifter", "werewolf", "fallen angel", "merfolk",
    "oracle", "time traveler", "cursed", "immortal", "half-human", "artificial soul",
    "chosen one", "villain-coded", "antihero", "reformed menace", "morally gray", "chaos gremlin",
    "knife enthusiast", "healer", "mercenary", "bounty hunter", "runaway royal", "detective",
    "bard", "alchemist", "mechanic", "hacker", "cult survivor", "ex-villain", "rebel",
    "loner", "protective older sibling vibes", "younger sibling energy", "parent friend",
    "overachiever", "burnt out gifted kid", "night owl", "insomniac", "workaholic",
    "too smart for their own good", "emotionally constipated", "overshares accidentally",
    "soft-spoken", "loudmouth", "gentle giant", "small but feral", "pretty liar",
    "dangerously charming", "unhinged", "melancholic", "overprotective", "loyal to a fault",
    "acts mean cares deeply", "fake confidence", "self-destructive", "survivor", "vengeful",
    "co-dependent", "high-maintenance", "low empathy", "empathetic", "chaotic good",
    "lawful evil", "neutral menace", "cryptid energy", "cat person", "dog person",
    "tea addict", "coffee addict", "collector", "musician", "poet", "artist",
    "hopelessly curious", "emotionally intelligent", "bad at feelings", "stubborn",
    "flirts as a defense mechanism", "danger magnet", "secret sweetheart",
    "looks intimidating but cries easily", "unreadable expression", "dramatic", "chaos bisexual",
    "friend to all strays", "carries too many secrets", "always tired", "surprisingly domestic",
    "physically affectionate", "verbally affectionate", "acts tough loves deeply",
    "protective menace", "wild card", "unapologetically strange", "deeply lonely"
] as const;

const BACKSTORY_ORIGINS = [
    "Was taught to smile through pain because weakness invited trouble.",
    "Grew up hearing stories about a war nobody admits really happened.",
    "Learned early that trust was usually traded, not given.",
    "Spent most of childhood hiding parts of themselves to stay safe.",
    "Was praised for being useful, never for being happy.",
    "Came from a household where silence carried more weight than words.",
    "Was raised by someone who loved them but never understood them.",
    "Still carries habits from a strict upbringing they pretend didn’t affect them.",
    "Had one person who truly understood them, and lost them too soon.",
    "Was always treated like the backup plan instead of the first choice.",
    "Grew up around wealth but never felt secure.",
    "Learned to fight because talking rarely solved anything where they lived.",
    "Was blamed for something that was never entirely their fault.",
    "Spent years trying to become the version of themselves others expected.",
    "Was raised in a community where outsiders were automatically distrusted.",
    "Never stayed anywhere long enough to call it home.",
    "Was protected from the world so heavily they barely know how to live in it.",
    "Knows how to disappear into a crowd without being noticed.",
    "Had responsibilities far too young and never really got a childhood.",
    "Was once deeply loyal to a cause, until they saw what it really was.",
    "Grew up surrounded by rules that seemed to change depending on who broke them.",
    "Learned charm before honesty because it worked better.",
    "Was considered difficult simply for asking questions nobody else would.",
    "Still feels uncomfortable when things are calm for too long.",
    "Was raised to believe emotions should always stay private.",
    "Left home to escape becoming exactly like their family.",
    "Knows what it feels like to owe someone everything.",
    "Was admired publicly but ignored privately.",
    "Learned survival from people society pretended didn’t exist.",
    "Spent years trying to outrun a reputation they never asked for.",
    "Was told their future was already decided before they could choose for themselves.",
    "Feels more comfortable around strangers than people who know them well.",
    "Was raised in an environment where affection always came with conditions.",
    "Learned to read people quickly because it kept them safe.",
    "Still struggles to believe people stay when given the choice to leave.",
    "Was once part of something beautiful before it became dangerous.",
    "Carries guilt for leaving people behind even if they had no choice.",
    "Learned to rely on themselves because promises rarely lasted.",
    "Was feared by others long before they understood why.",
    "Spent years pretending not to care about belonging anywhere."
] as const;

const BACKSTORY_TURNS = [
    "A deal they accepted too quickly still follows them years later.",
    "One terrible decision forced them to grow up overnight.",
    "They survived something nobody else believes really happened.",
    "A missing person case somehow always circles back to them.",
    "They were once trusted with something dangerous and lost it.",
    "A fire, flood, or disaster erased the life they used to know.",
    "They uncovered evidence that powerful people wanted buried.",
    "They escaped a place nobody leaves willingly.",
    "They were blamed for protecting the wrong person.",
    "They broke a rule everyone else was too afraid to challenge.",
    "They witnessed something impossible and have never fully recovered from it.",
    "A friendship ended so badly it still shapes how they trust people.",
    "They inherited an enemy instead of a legacy.",
    "They were chosen for something sacred and rejected it publicly.",
    "They accidentally became a symbol for people desperate for hope.",
    "They once disappeared under suspicious circumstances and refuse to explain why.",
    "They survived captivity by becoming harder to understand.",
    "A mistake during training left permanent consequences for someone else.",
    "They found out too late they had been raised on lies.",
    "They were abandoned somewhere they were never meant to survive.",
    "They lost control one time and the damage still follows them.",
    "They once betrayed someone they loved for what felt like the right reason.",
    "A powerful figure took interest in them for reasons still unclear.",
    "They returned home after years away and barely recognized the place.",
    "They uncovered corruption inside the institution that raised them.",
    "They once had the chance to escape everything and chose not to.",
    "They learned the monster in local stories was once a real person.",
    "A failed mission left them as the only survivor.",
    "They were forced to keep a dangerous secret to protect someone innocent.",
    "They discovered their role in a larger plan far too late.",
    "They were used as leverage in a conflict they barely understood.",
    "Someone erased parts of their past and they are still piecing it together.",
    "They once trusted the wrong person with catastrophic results.",
    "A public humiliation hardened them more than any physical injury.",
    "They crossed a line they swore they never would and survived anyway.",
    "They inherited leadership during a crisis nobody else wanted to face.",
    "They found proof that a beloved hero was far worse than history claims.",
    "They escaped punishment by sacrificing their reputation instead.",
    "They were separated from someone important by circumstances neither could control.",
    "A rival saved their life once and neither of them talks about it.",
    "They discovered they were connected to an old disaster everyone tried to forget.",
    "They spent years believing they were the problem until they learned otherwise.",
    "They became dangerous long before they became confident.",
    "They walked away from a victory that cost too much.",
    "They survived being hunted and never fully stopped looking over their shoulder.",
    "They were forced to choose between loyalty and survival and still regret the answer.",
    "They accidentally exposed a secret that destabilized an entire community.",
    "They once impersonated someone else for so long it changed who they became.",
    "They uncovered the truth about their origins and wished they hadn’t.",
    "They lost faith in something sacred after seeing what people did in its name."
] as const;

const BACKSTORY_PRESENT = [
    "Now they laugh first whenever conversations get too personal.",
    "Now they notice exits, patterns, and lies without meaning to.",
    "Now they hold onto small routines because chaos still feels close.",
    "Now they struggle to tell the difference between loyalty and obligation.",
    "Now they speak carefully, as if every word could still be used against them.",
    "Now they keep secrets out of habit even when there is no danger anymore.",
    "Now they find comfort in people who never ask too many questions.",
    "Now they test people quietly before allowing themselves to care.",
    "Now they pretend independence is a choice instead of a reflex.",
    "Now they are gentler with others than they have ever been with themselves.",
    "Now they avoid staying in one place long enough to feel trapped again.",
    "Now they carry confidence like armor, polished and convincing.",
    "Now they treat kindness like something fragile and easy to lose.",
    "Now they work hard to become the kind of person they once needed.",
    "Now they distrust easy answers and perfect promises.",
    "Now they collect skills the way other people collect memories.",
    "Now they act like they expect betrayal so disappointment hurts less.",
    "Now they are learning how to want things without apologizing for it.",
    "Now they feel most at peace when nobody expects anything from them.",
    "Now they hide exhaustion behind humor and good timing.",
    "Now they are trying to believe they deserve more than survival.",
    "Now they struggle whenever someone offers help without conditions.",
    "Now they keep their emotions organized so tightly they sometimes forget they exist.",
    "Now they use competence to avoid being vulnerable.",
    "Now they still hesitate before calling anywhere home.",
    "Now they trust actions long before they trust words.",
    "Now they are careful about who gets to see them angry.",
    "Now they feel strangely protective of people who remind them of their younger self.",
    "Now they avoid making promises unless they fully intend to keep them.",
    "Now they keep expecting peace to disappear the moment they relax.",
    "Now they have become very good at surviving situations they should never have endured.",
    "Now they crave closeness while fearing what comes with it.",
    "Now they disappear for days whenever emotions become too difficult to explain.",
    "Now they are trying to unlearn the idea that love must always be earned.",
    "Now they can read tension in a room before anyone speaks.",
    "Now they prefer honesty that hurts over comfort that lies.",
    "Now they are slowly realizing anger was never their only survival skill.",
    "Now they let silence speak when words feel too dangerous.",
    "Now they keep people safe in ways nobody immediately notices.",
    "Now they are learning that being needed is not the same as being loved."
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

type IdentityProfile = {
    genderIdentity: string;
    orientation: string;
    pronouns: string | string[];
};

type PersonaBits = {
    species: string;
    style: "grounded" | "fantasy" | "scifi";
    tone: string;
    aesthetics: string[];
    quirks: string[];
    hobbies: string[];
    backstory: string;
    profileTags: string[];
    identity: IdentityProfile | { pair: [IdentityProfile, IdentityProfile] };
};

type DiversityBucket =
    | "species"
    | "tone"
    | "genderIdentity"
    | "orientation"
    | "profileTag"
    | "style"
    | "quirk"
    | "aesthetic";

type DiversityTracker = Record<DiversityBucket, Map<string, number>>;

type WeightedPickOptions<T extends string> = {
    bucket: DiversityBucket;
    pool: readonly T[];
    requiredBoosts?: Partial<Record<T, number>>;
    preferred?: readonly T[];
    avoid?: readonly T[];
};

function createDiversityTracker(): DiversityTracker {
    return {
        species: new Map(),
        tone: new Map(),
        genderIdentity: new Map(),
        orientation: new Map(),
        profileTag: new Map(),
        style: new Map(),
        quirk: new Map(),
        aesthetic: new Map(),
    };
}

function incrementCount(map: Map<string, number>, key: string) {
    map.set(key, (map.get(key) ?? 0) + 1);
}

function getCount(map: Map<string, number>, key: string) {
    return map.get(key) ?? 0;
}

function weightedPick<T extends string>(
    rng: Rng,
    tracker: DiversityTracker,
    options: WeightedPickOptions<T>,
): T {
    const {
        bucket,
        pool,
        requiredBoosts = {},
        preferred = [],
        avoid = [],
    } = options;

    const counts = tracker[bucket];
    const scored = pool.map((value) => {
        const count = getCount(counts, value);
        const scarcityWeight = 1 / (1 + count * 1.75);
        const requiredBoost = requiredBoosts[value] ?? 1;
        const preferredBoost = preferred.includes(value) ? 1.35 : 1;
        const avoidPenalty = avoid.includes(value) ? 0.55 : 1;
        const jitter = 0.92 + rng() * 0.16;
        const weight = Math.max(0.0001, scarcityWeight * requiredBoost * preferredBoost * avoidPenalty * jitter);
        return { value, weight };
    });

    const total = scored.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = rng() * total;

    for (const entry of scored) {
        roll -= entry.weight;
        if (roll <= 0) return entry.value;
    }

    return scored[scored.length - 1].value;
}

function weightedPickUnique<T extends string>(
    rng: Rng,
    tracker: DiversityTracker,
    bucket: DiversityBucket,
    pool: readonly T[],
    count: number,
    requiredBoosts?: Partial<Record<T, number>>,
): T[] {
    const selected: T[] = [];
    const remaining = [...pool];
    const target = Math.max(0, Math.min(count, remaining.length));

    while (selected.length < target && remaining.length > 0) {
        const next = weightedPick(rng, tracker, {
            bucket,
            pool: remaining,
            requiredBoosts,
            avoid: selected,
        });
        selected.push(next);
        remaining.splice(remaining.indexOf(next), 1);
    }

    return selected;
}

function recordPersona(tracker: DiversityTracker, persona: PersonaBits) {
    incrementCount(tracker.species, persona.species);
    incrementCount(tracker.tone, persona.tone);
    incrementCount(tracker.style, persona.style);

    for (const aesthetic of persona.aesthetics) {
        incrementCount(tracker.aesthetic, aesthetic);
    }

    for (const quirk of persona.quirks) {
        incrementCount(tracker.quirk, quirk);
    }

    for (const tag of persona.profileTags) {
        incrementCount(tracker.profileTag, tag);
    }

    if ("pair" in persona.identity) {
        for (const item of persona.identity.pair) {
            incrementCount(tracker.genderIdentity, item.genderIdentity);
            incrementCount(tracker.orientation, item.orientation);
        }
        return;
    }

    incrementCount(tracker.genderIdentity, persona.identity.genderIdentity);
    incrementCount(tracker.orientation, persona.identity.orientation);
}

function pickSpeciesStyle(rng: Rng, a: Archetype): "grounded" | "fantasy" | "scifi" {
    const joined = `${a.id} ${a.label} ${a.safeBaseCategories.join(" ")} ${a.adultBaseCategories.join(" ")}`.toLowerCase();
    if (joined.includes("sci") || joined.includes("alien") || joined.includes("pilot")) {
        return rng() < 0.8 ? "scifi" : "grounded";
    }
    if (
        joined.includes("witch") ||
        joined.includes("fantasy") ||
        joined.includes("supernatural") ||
        joined.includes("demon") ||
        joined.includes("elf") ||
        joined.includes("goblin")
    ) {
        return rng() < 0.85 ? "fantasy" : "grounded";
    }
    if (rng() < 0.18) return "fantasy";
    if (rng() < 0.08) return "scifi";
    return "grounded";
}

function makeIdentityProfile(
    rng: Rng,
    kind: Kind,
    tracker: DiversityTracker,
): IdentityProfile | { pair: [IdentityProfile, IdentityProfile] } {
    const makeSingle = (baseKind: Exclude<Kind, "couple">): IdentityProfile => {
        const weightedGenderPool =
            baseKind === "man"
                ? ["man", "man", "trans man", "nonbinary", "genderfluid", "transmasc"] as const
                : ["woman", "woman", "trans woman", "nonbinary", "genderfluid", "transfemme"] as const;

        const genderIdentity = weightedPick(rng, tracker, {
            bucket: "genderIdentity",
            pool: weightedGenderPool,
            requiredBoosts: {
                "trans man": 2.4,
                "trans woman": 2.4,
                nonbinary: 2.1,
                genderfluid: 1.9,
                transmasc: 1.8,
                transfemme: 1.8,
            },
        });

        const orientation = weightedPick(rng, tracker, {
            bucket: "orientation",
            pool: ORIENTATIONS,
            requiredBoosts: {
                gay: 2.2,
                lesbian: 2.2,
                bisexual: 1.7,
                pansexual: 1.7,
                queer: 1.8,
                asexual: 1.5,
                aromantic: 1.4,
                demisexual: 1.4,
            },
        });

        const pronounsPool =
            genderIdentity === "man" || genderIdentity === "trans man"
                ? (["he/him", "he/they"] as const)
                : genderIdentity === "woman" || genderIdentity === "trans woman"
                    ? (["she/her", "she/they"] as const)
                    : (["they/them", "she/they", "he/they"] as const);

        return {
            genderIdentity,
            orientation,
            pronouns: pick(rng, pronounsPool),
        };
    };

    if (kind === "couple") {
        const kindA: Exclude<Kind, "couple"> = rng() < 0.5 ? "man" : "woman";
        const kindB: Exclude<Kind, "couple"> = rng() < 0.5 ? "man" : "woman";
        return { pair: [makeSingle(kindA), makeSingle(kindB)] };
    }

    return makeSingle(kind);
}

function buildBackstory(rng: Rng) {
    return `${pick(rng, BACKSTORY_ORIGINS)} ${pick(rng, BACKSTORY_TURNS)} ${pick(rng, BACKSTORY_PRESENT)}`;
}

function makeSingleName(
    rng: Rng,
    kind: Exclude<Kind, "couple">,
    style: "grounded" | "fantasy" | "scifi",
    genderIdentity: string,
) {
    let firstPool: readonly string[];
    if (style === "fantasy") firstPool = FANTASY_NAMES;
    else if (style === "scifi") firstPool = SCIFI_NAMES;
    else if (genderIdentity === "nonbinary" || genderIdentity === "genderfluid" || genderIdentity === "agender") {
        firstPool = FIRST_NAMES_NEUTRAL;
    } else {
        firstPool = kind === "man" ? FIRST_NAMES_M : FIRST_NAMES_F;
    }

    const first = pick(rng, firstPool);
    const last = style === "grounded" ? pick(rng, LAST_NAMES) : "";
    return {
        display: [first, last].filter(Boolean).join(" "),
        first,
        last,
    };
}

function makeDisplayNameFromIdentity(
    rng: Rng,
    kind: Kind,
    style: "grounded" | "fantasy" | "scifi",
    identity: IdentityProfile | { pair: [IdentityProfile, IdentityProfile] },
) {
    if (kind === "couple" && "pair" in identity) {
        const kindA: Exclude<Kind, "couple"> = rng() < 0.5 ? "man" : "woman";
        const kindB: Exclude<Kind, "couple"> = rng() < 0.5 ? "man" : "woman";
        const a = makeSingleName(rng, kindA, style, identity.pair[0].genderIdentity);
        const b = makeSingleName(rng, kindB, style, identity.pair[1].genderIdentity);
        const sharedLast = style === "grounded" ? pick(rng, LAST_NAMES) : "";
        return {
            display: sharedLast ? `${a.first} & ${b.first} ${sharedLast}` : `${a.first} & ${b.first}`,
            members: [a.display, b.display],
        };
    }

    const single = identity as IdentityProfile;
    const person = makeSingleName(rng, kind as Exclude<Kind, "couple">, style, single.genderIdentity);
    return { display: person.display, members: [person.display] };
}

function identityTags(identity: IdentityProfile) {
    const out: string[] = [];
    const g = identity.genderIdentity.toLowerCase();
    const o = identity.orientation.toLowerCase();

    if (g.includes("trans")) out.push("trans");
    if (g === "nonbinary") out.push("nonbinary");
    if (g === "genderfluid") out.push("genderfluid");

    if (o === "gay") out.push("gay");
    if (o === "lesbian") out.push("lesbian");
    if (o === "bisexual") out.push("bi");
    if (o === "pansexual") out.push("pan");
    if (o === "asexual") out.push("ace");
    if (o === "aromantic") out.push("aro");
    if (o === "queer") out.push("queer");

    return out;
}

function buildPersonaBits(
    rng: Rng,
    a: Archetype,
    tracker: DiversityTracker,
    adult: boolean,
): PersonaBits {
    const style = weightedPick(rng, tracker, {
        bucket: "style",
        pool: ["grounded", "fantasy", "scifi"] as const,
        requiredBoosts:
            pickSpeciesStyle(rng, a) === "fantasy"
                ? { fantasy: 2.8, scifi: 0.8, grounded: 0.9 }
                : pickSpeciesStyle(rng, a) === "scifi"
                    ? { scifi: 2.8, fantasy: 0.7, grounded: 0.9 }
                    : { grounded: 2.0, fantasy: 1.15, scifi: 1.05 },
    });

    const speciesPool =
        style === "fantasy"
            ? SPECIES_BY_STYLE.fantasy
            : style === "scifi"
                ? SPECIES_BY_STYLE.scifi
                : SPECIES_BY_STYLE.grounded;

    const species = weightedPick(rng, tracker, {
        bucket: "species",
        pool: speciesPool,
        requiredBoosts:
            style === "fantasy"
                ? {
                    elf: 1.8,
                    goblin: 1.9,
                    witch: 2.1,
                    demon: 2.0,
                    vampire: 1.7,
                    ghost: 1.6,
                }
                : style === "scifi"
                    ? {
                        alien: 2.2,
                        android: 1.9,
                        cyborg: 1.5,
                        starborn: 1.6,
                        "void-touched": 1.6,
                    }
                    : { human: 1.0 },
    });

    const tone = weightedPick(rng, tracker, {
        bucket: "tone",
        pool: adult ? ADULT_TONES : SAFE_TONES,
        requiredBoosts: {
            chaotic: 1.5,
            gothic: 1.5,
            cosmic: 1.4,
            "slow-burn": 1.3,
            protective: 1.2,
        } as Partial<Record<(typeof ADULT_TONES)[number] | (typeof SAFE_TONES)[number], number>>,
    });

    const aesthetics = weightedPickUnique(
        rng,
        tracker,
        "aesthetic",
        AESTHETICS,
        2,
        {
            dominant: 2.2,
            witchy: 1.7,
            spacecore: 1.7,
            "romantic goth": 1.6,
            "dark academia": 1.4,
            "ghostly elegance": 1.5,
            "arcane chic": 1.6,
            forestcore: 1.4,
            cyberpunk: 1.5,
        },
    );

    const quirks = weightedPickUnique(
        rng,
        tracker,
        "quirk",
        QUIRKS,
        2,
        {
            "Collects tiny cursed-looking objects for fun.": 1.5,
            "Talks to plants, machines, or ghosts like old friends.": 1.8,
            "Always has a backup plan and a worse plan.": 1.3,
            "Names every tool, weapon, or kitchen knife.": 1.4,
            "Changes their style after every personal crisis.": 1.3,
        },
    );

    const hobbies = pickUnique(rng, HOBBIES, 2);
    const backstory = buildBackstory(rng);
    const identity = makeIdentityProfile(rng, a.kind, tracker);

    const tags: string[] = [species, tone, ...aesthetics];

    if ("pair" in identity) {
        identity.pair.forEach((entry) => tags.push(...identityTags(entry)));
    } else {
        tags.push(...identityTags(identity));
    }

    if (species.includes("witch")) tags.push("witchy");
    if (species.includes("alien")) tags.push("alien");
    if (species.includes("demon")) tags.push("demon");
    if (species.includes("elf")) tags.push("elf");
    if (species.includes("goblin")) tags.push("goblin");
    if (species.includes("android")) tags.push("android");
    if (species.includes("vampire")) tags.push("vampire");
    if (species.includes("ghost")) tags.push("ghost");

    if (tone === "chaotic") tags.push("chaotic");
    if (tone === "slow-burn") tags.push("slow burn");
    if (tone === "gothic") tags.push("haunted");
    if (a.relationshipSlugsSafe.includes("rel-found-family")) tags.push("found family");
    if (a.relationshipSlugsSafe.includes("rel-guardian")) tags.push("guardian");

    const extraTags = weightedPickUnique(
        rng,
        tracker,
        "profileTag",
        EXTRA_PERSONA_TAGS,
        3,
        {
            dominant: 2.2,
            trans: 2.2,
            gay: 2.0,
            lesbian: 2.0,
            nonbinary: 1.9,
            genderfluid: 1.7,
            alien: 1.7,
            demon: 1.7,
            elf: 1.7,
            goblin: 1.8,
            android: 1.7,
            witchy: 1.6,
            haunted: 1.4,
            chaotic: 1.4,
            "found family": 1.4,
            guardian: 1.4,
            "slow burn": 1.3,
        },
    );

    return {
        species,
        style,
        tone,
        aesthetics,
        quirks,
        hobbies,
        backstory,
        profileTags: uniqueStrings([...tags, ...extraTags]),
        identity,
    };
}

function buildDescriptionSafe(
    rng: Rng,
    a: Archetype,
    personLabel: string,
    persona: PersonaBits,
) {
    const hook = pick(rng, a.safeHooks);
    const setting = pick(rng, a.settings);
    const hobby = pick(rng, persona.hobbies);
    const quirk = pick(rng, persona.quirks);
    return `${personLabel} — ${hook} ${titleCase(persona.species)} with a ${persona.tone} vibe. You meet in ${setting}. Loves ${hobby}. ${quirk} Backstory: ${persona.backstory}`;
}

function buildDescriptionAdult(
    rng: Rng,
    a: Archetype,
    personLabel: string,
    persona: PersonaBits,
) {
    const hook = pick(rng, a.adultHooks);
    const setting = pick(rng, a.settings);
    const hobby = pick(rng, persona.hobbies);
    const boundary = pick(rng, BOUNDARIES_ADULT);
    return `${personLabel} — ${hook} ${titleCase(persona.species)} with a ${persona.tone} energy. Setting: ${setting}. Likes ${hobby}. ${boundary} Backstory: ${persona.backstory}`;
}

function buildCategoriesSafe(rng: Rng, a: Archetype, persona: PersonaBits): string[] {
    const base = [...a.safeBaseCategories];
    const trait = pick(rng, SAFE_TRAIT_SLUGS);
    const extra = pickUnique(
        rng,
        [
            "safe-romance", "safe-friendship", "safe-slice-of-life", "safe-adventure",
            "safe-comedy", "safe-wholesome", "safe-slow-burn", "safe-flirty",
            "safe-fantasy", "safe-supernatural", "safe-sci-fi", "safe-mystery",
            "safe-gothic", "safe-chaotic", "safe-haunted", "safe-cosmic",
        ] as const,
        3,
    );

    const occ = pickUnique(rng, a.occSlugs, rngInt(rng, 1, Math.min(2, a.occSlugs.length)));
    const set = pickUnique(rng, a.settingSlugs, rngInt(rng, 1, Math.min(2, a.settingSlugs.length)));
    const rel = pickUnique(rng, a.relationshipSlugsSafe, rngInt(rng, 1, Math.min(2, a.relationshipSlugsSafe.length)));

    const fantasyBoost =
        persona.style === "fantasy"
            ? ["safe-fantasy", "safe-supernatural"]
            : persona.style === "scifi"
                ? ["safe-sci-fi"]
                : [];

    const toneBoost =
        persona.tone === "gothic"
            ? ["safe-gothic"]
            : persona.tone === "chaotic"
                ? ["safe-chaotic"]
                : persona.tone === "cosmic"
                    ? ["safe-cosmic"]
                    : [];

    return uniqueStrings([...base, trait, ...extra, ...occ, ...set, ...rel, ...fantasyBoost, ...toneBoost]);
}

function buildCategoriesAdult(rng: Rng, a: Archetype, persona: PersonaBits): string[] {
    const base = [...a.adultBaseCategories];
    const maybeBdsm = rng() < 0.35 ? ["adult-bdsm"] : [];
    const maybeAdultTrait = rng() < 0.55 ? [pick(rng, ADULT_TRAIT_SLUGS)] : [];
    const maybeKinks =
        rng() < 0.45
            ? pickUnique(
                rng,
                ["kink-powerplay", "kink-praise", "kink-teasing", "kink-roleplay"] as const,
                rngInt(rng, 1, 2),
            )
            : [];

    const occ = pickUnique(rng, a.occSlugs, rngInt(rng, 1, Math.min(2, a.occSlugs.length)));
    const set = pickUnique(rng, a.settingSlugs, rngInt(rng, 1, Math.min(2, a.settingSlugs.length)));
    const rel = pickUnique(rng, a.relationshipSlugsAdult, rngInt(rng, 1, Math.min(2, a.relationshipSlugsAdult.length)));

    const fantasyBoost =
        persona.style === "fantasy"
            ? ["adult-fantasy", "adult-supernatural"]
            : persona.style === "scifi"
                ? ["adult-sci-fi"]
                : [];

    const toneBoost =
        persona.tone === "gothic"
            ? ["adult-gothic"]
            : persona.tone === "chaotic"
                ? ["adult-chaotic"]
                : persona.tone === "sadistic"
                    ? ["adult-sadistic"]
                    : [];

    return uniqueStrings([...base, ...maybeBdsm, ...maybeAdultTrait, ...maybeKinks, ...occ, ...set, ...rel, ...fantasyBoost, ...toneBoost]);
}

export function generateCompanions(opts: {
    countPerArchetype: number;
    seed: string;
    includeAdult: boolean;
    adultVisibility: Visibility;
}): CompanionSeed[] {
    const out: CompanionSeed[] = [];
    const usedNames = new Set<string>();
    const diversity = createDiversityTracker();

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

            const safePersona = buildPersonaBits(safeRng, a, diversity, false);
            recordPersona(diversity, safePersona);

            const safeNameBase = makeDisplayNameFromIdentity(
                safeRng,
                a.kind,
                safePersona.style,
                safePersona.identity,
            );
            const safeName = makeUniqueName(`${safeNameBase.display} — ${a.label}`, safeRng);
            const safeSlug = slugify(`${a.id}-${i + 1}-safe`);

            out.push({
                slug: safeSlug,
                name: safeName,
                description: buildDescriptionSafe(safeRng, a, safeName, safePersona),
                tags: uniqueStrings([
                    a.kind,
                    "safe",
                    a.id,
                    safePersona.tone,
                    safePersona.species,
                    ...safePersona.profileTags,
                ]),
                archetype: a.label,
                profile: {
                    kind: a.kind,
                    rating: "safe",
                    adultsOnly: true,
                    ageMin: 18,
                    tone: safePersona.tone,
                    species: safePersona.species,
                    aesthetics: safePersona.aesthetics,
                    quirks: safePersona.quirks,
                    hobbies: safePersona.hobbies,
                    backstory: safePersona.backstory,
                    profileTags: safePersona.profileTags,
                    identity: safePersona.identity,
                    occupationTags: a.occSlugs,
                    settingTags: a.settingSlugs,
                },
                visibility: Visibility.PUBLIC,
                contentRating: ContentRating.SAFE,
                categorySlugs: buildCategoriesSafe(safeRng, a, safePersona),
            });

            if (!opts.includeAdult) continue;

            const adultPersona = buildPersonaBits(adultRng, a, diversity, true);
            recordPersona(diversity, adultPersona);

            const adultNameBase = makeDisplayNameFromIdentity(
                adultRng,
                a.kind,
                adultPersona.style,
                adultPersona.identity,
            );
            const adultName = makeUniqueName(`${adultNameBase.display} — ${a.label} (18+)`, adultRng);
            const adultSlug = slugify(`${a.id}-${i + 1}-adult`);

            out.push({
                slug: adultSlug,
                name: adultName,
                description: buildDescriptionAdult(adultRng, a, adultName, adultPersona),
                tags: uniqueStrings([
                    a.kind,
                    "adult",
                    a.id,
                    adultPersona.tone,
                    adultPersona.species,
                    ...adultPersona.profileTags,
                ]),
                archetype: a.label,
                profile: {
                    kind: a.kind,
                    rating: "adult",
                    adultsOnly: true,
                    ageMin: 18,
                    tone: adultPersona.tone,
                    species: adultPersona.species,
                    aesthetics: adultPersona.aesthetics,
                    quirks: adultPersona.quirks,
                    hobbies: adultPersona.hobbies,
                    backstory: adultPersona.backstory,
                    profileTags: adultPersona.profileTags,
                    identity: adultPersona.identity,
                    boundaries: pickUnique(adultRng, BOUNDARIES_ADULT, 2),
                    occupationTags: a.occSlugs,
                    settingTags: a.settingSlugs,
                },
                visibility: opts.adultVisibility,
                contentRating: ContentRating.ADULT,
                categorySlugs: buildCategoriesAdult(adultRng, a, adultPersona),
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
    const countPerArchetype = Number(process.env.SEED_COUNT_PER_ARCHETYPE ?? "25");
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
