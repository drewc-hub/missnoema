import {
  PrismaClient,
  CategoryType,
  ContentRating,
  Visibility,
} from "@prisma/client";
import {
  generateCompanionProfile,
  type ContentRating as GenRating,
  type IntensityTier,
} from "../src/lib/companions/generator";
import crypto from "node:crypto";

const prisma = new PrismaClient();

function env(name: string, fallback?: string) {
  const v = process.env[name];
  if (v == null || v === "") {
    if (fallback != null) return fallback;
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function stableSeedFrom(input: string) {
  const h = crypto.createHash("sha256").update(input).digest();
  return h.readUInt32LE(0);
}

type SeedCategory = {
  name: string;
  type: CategoryType;
  isAdult: boolean;
  order?: number;
};

const BASE_CATEGORIES: SeedCategory[] = [
  { name: "Romance", type: "GENRE", isAdult: false, order: 10 },
  { name: "Slow Burn", type: "TONE", isAdult: false, order: 20 },
  { name: "Playful", type: "TONE", isAdult: false, order: 30 },
  { name: "Comfort", type: "TONE", isAdult: false, order: 40 },

  { name: "Teasing", type: "TRAIT", isAdult: false, order: 50 },
  { name: "Protective", type: "TRAIT", isAdult: false, order: 60 },
  { name: "Nurturing", type: "TRAIT", isAdult: false, order: 70 },
  { name: "Witty", type: "TRAIT", isAdult: false, order: 80 },

  // Adult-adjacent (still non-explicit)
  { name: "Suggestive", type: "TONE", isAdult: true, order: 100 },
  { name: "Kink-adjacent", type: "KINK", isAdult: true, order: 110 },
  { name: "Power-play tone", type: "KINK", isAdult: true, order: 120 },
  { name: "Praise", type: "KINK", isAdult: true, order: 130 },
];

async function upsertCategories() {
  for (const c of BASE_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: slugify(c.name) },
      update: {
        name: c.name,
        type: c.type,
        isAdult: c.isAdult,
        order: c.order ?? 0,
      },
      create: {
        name: c.name,
        slug: slugify(c.name),
        type: c.type,
        isAdult: c.isAdult,
        order: c.order ?? 0,
      },
    });
  }
}

async function categoryIdsByName(names: string[]) {
  const slugs = names.map(slugify);
  const cats = await prisma.category.findMany({
    where: { slug: { in: slugs } },
    select: { id: true, slug: true },
  });
  const map = new Map(cats.map((c) => [c.slug, c.id]));
  return slugs.map((s) => map.get(s)).filter(Boolean) as string[];
}

function mapProfileToCategoryNames(
  profileTags: string[],
  rating: GenRating,
): string[] {
  const names: string[] = [];

  if (profileTags.includes("protective")) names.push("Protective");
  if (profileTags.includes("nurturing")) names.push("Nurturing");
  if (profileTags.includes("witty")) names.push("Witty");
  if (profileTags.includes("playful")) names.push("Playful");

  // Always add genre/tone
  names.push("Romance");
  names.push(profileTags.includes("tier-0") ? "Comfort" : "Slow Burn");

  if (rating === "ADULT") {
    names.push("Suggestive");
    if (profileTags.includes("kink-adjacent")) names.push("Kink-adjacent");
    if (profileTags.includes("power-play")) names.push("Power-play tone");
    if (profileTags.includes("praise")) names.push("Praise");
  }

  return [...new Set(names)];
}

async function createCompanionRow(params: {
  rating: ContentRating;
  visibility: Visibility;
  profile: any;
  tags: string[];
}) {
  const name = params.profile?.basics?.name ?? "Companion";
  const baseSlug = slugify(
    `${name}-${params.rating}-${params.tags.find((t) => t.startsWith("tier-")) ?? "tier"}`,
  );
  const slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`;

  return prisma.companion.create({
    data: {
      ownerId: null,
      name,
      slug,
      description: params.profile.hooks?.openingLine ?? "A charming companion.",
      archetype:
        params.tags.find((t) => t === "core" || t === "kink-adjacent") ??
        "core",
      tags: params.tags,
      profile: params.profile,
      visibility: params.visibility,
      contentRating: params.rating as any,
    },
    select: { id: true, slug: true },
  });
}

async function attachCategories(companionId: string, categoryIds: string[]) {
  await prisma.companionCategory.createMany({
    data: categoryIds.map((categoryId) => ({ companionId, categoryId })),
    skipDuplicates: true,
  });
}

async function main() {
  const safeCount = Number(process.env.SEED_SAFE_COUNT ?? "60");
  const adultCount = Number(process.env.SEED_ADULT_COUNT ?? "60");
  const safeTier: IntensityTier = Number(
    process.env.SEED_SAFE_TIER ?? "1",
  ) as IntensityTier;
  const adultTier: IntensityTier = Number(
    process.env.SEED_ADULT_TIER ?? "3",
  ) as IntensityTier;

  await upsertCategories();

  const labelCycle: Array<"MEN" | "WOMEN" | "COUPLES" | "NB"> = [
    "WOMEN",
    "MEN",
    "NB",
    "COUPLES",
  ];

  let created = 0;

  for (let i = 0; i < safeCount; i++) {
    const label = labelCycle[i % labelCycle.length];
    const profile = generateCompanionProfile({
      seed: stableSeedFrom(`SAFE-${i}-${label}`),
      rating: "SAFE",
      intensity: safeTier,
      archetypeTag: "core",
      label,
    });

    const row = await createCompanionRow({
      rating: "SAFE" as any,
      visibility: "PUBLIC" as any,
      profile,
      tags: profile.tags,
    });

    const catNames = mapProfileToCategoryNames(profile.tags, profile.rating);
    const ids = await categoryIdsByName(catNames);
    await attachCategories(row.id, ids);
    created++;
  }

  for (let i = 0; i < adultCount; i++) {
    const label = labelCycle[(i + 1) % labelCycle.length];
    const profile = generateCompanionProfile({
      seed: stableSeedFrom(`ADULT-${i}-${label}`),
      rating: "ADULT",
      intensity: adultTier,
      archetypeTag: "kink-adjacent",
      label,
    });

    const row = await createCompanionRow({
      rating: "ADULT" as any,
      visibility: "UNLISTED" as any, // safer default for adult profiles
      profile,
      tags: profile.tags,
    });

    const catNames = mapProfileToCategoryNames(profile.tags, profile.rating);
    const ids = await categoryIdsByName(catNames);
    await attachCategories(row.id, ids);
    created++;
  }

  console.log(
    `Seed complete. Created companions: ${created}. (SAFE=${safeCount}, ADULT=${adultCount})`,
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
