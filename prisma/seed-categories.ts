import { PrismaClient, CategoryType } from "@prisma/client";

const prisma = new PrismaClient();

const categories = [
  { name: "Romance", slug: "romance", type: CategoryType.GENRE, order: 1 },
  { name: "Fantasy", slug: "fantasy", type: CategoryType.GENRE, order: 2 },
  { name: "Sci-Fi", slug: "sci-fi", type: CategoryType.GENRE, order: 3 },
  {
    name: "Slice of Life",
    slug: "slice-of-life",
    type: CategoryType.GENRE,
    order: 4,
  },

  { name: "Flirty", slug: "flirty", type: CategoryType.TONE, order: 10 },
  { name: "Cozy", slug: "cozy", type: CategoryType.TONE, order: 11 },
  {
    name: "Mature Themes",
    slug: "mature-themes",
    type: CategoryType.TONE,
    order: 12,
  },

  { name: "Dominant", slug: "dominant", type: CategoryType.TRAIT, order: 20 },
  { name: "Gentle", slug: "gentle", type: CategoryType.TRAIT, order: 21 },
  {
    name: "Protective",
    slug: "protective",
    type: CategoryType.TRAIT,
    order: 22,
  },
];

const assignments: Array<{ companionSlug: string; categorySlugs: string[] }> = [
  {
    companionSlug: "nova-coffee-date",
    categorySlugs: ["romance", "flirty", "cozy"],
  },
  { companionSlug: "luna-soft", categorySlugs: ["romance", "cozy", "gentle"] },
  {
    companionSlug: "sage-thoughtful",
    categorySlugs: ["romance", "mature-themes"],
  },
  { companionSlug: "kai-confident", categorySlugs: ["romance", "protective"] },
];

async function main() {
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      create: c,
      update: { name: c.name, type: c.type, order: c.order },
    });
  }

  const categoryMap = new Map(
    (await prisma.category.findMany({ select: { id: true, slug: true } })).map(
      (c) => [c.slug, c.id] as const,
    ),
  );

  for (const a of assignments) {
    const companion = await prisma.companion.findUnique({
      where: { slug: a.companionSlug },
      select: { id: true },
    });
    if (!companion) continue;

    for (const slug of a.categorySlugs) {
      const categoryId = categoryMap.get(slug);
      if (!categoryId) continue;

      await prisma.companionCategory.upsert({
        where: {
          companionId_categoryId: { companionId: companion.id, categoryId },
        },
        create: { companionId: companion.id, categoryId },
        update: {},
      });
    }
  }

  console.log("Seeded categories + assignments.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
