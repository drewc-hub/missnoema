import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { PrismaClient, ContentRating, Visibility } from "@prisma/client";

const prisma = new PrismaClient();

const ProfileSchema = z.object({
  style: z.string().min(1).max(80).default("romantic"),
  traits: z.array(z.string().min(1).max(40)).default([]),
  boundaries: z.array(z.string().min(1).max(80)).default(["no minors"]),
  openingLine: z.string().min(1).max(200).optional(),
});

const CompanionImportSchema = z.object({
  name: z.string().min(2).max(80),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().min(10).max(1000),
  tags: z.array(z.string().min(1).max(40)).default([]),
  archetype: z.string().max(80).optional(),
  visibility: z.enum(["PUBLIC", "UNLISTED", "PRIVATE"]).default("PUBLIC"),
  contentRating: z.enum(["SAFE", "ADULT"]).default("SAFE"),
  categories: z.array(z.string().min(1).max(80)).default([]), // category slugs
  profile: ProfileSchema,
});

type ImportCompanion = z.infer<typeof CompanionImportSchema>;

function readJsonFile<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw) as T;
}

/**
 * Hard safety gate: reject any entry that references minors/illegal content.
 * This is not the only safety layer, but it prevents accidental bad data imports.
 */
const BANNED_PATTERNS: RegExp[] = [
  /\bminor\b/i,
  /\bunderage\b/i,
  /\bchild\b/i,
  /\bteen\b/i,
  /\bloli\b/i,
  /\bcp\b/i,
  /\bincest\b/i,
  /\brape\b/i,
];

function assertNoBannedContent(c: ImportCompanion) {
  const blob = JSON.stringify(c).toLowerCase();
  for (const re of BANNED_PATTERNS) {
    if (re.test(blob)) {
      throw new Error(
        `Banned content detected for slug="${c.slug}" (pattern: ${re}).`,
      );
    }
  }
}

async function categoryModelExists(): Promise<boolean> {
  // If you added Category model, Prisma client will have prisma.category.
  return typeof (prisma as any).category?.findMany === "function";
}

async function ensureCategories(categorySlugs: string[]) {
  if (!(await categoryModelExists())) return;

  const uniq = Array.from(new Set(categorySlugs));
  for (const slug of uniq) {
    // Create as a simple category if it doesn't exist yet.
    await (prisma as any).category.upsert({
      where: { slug },
      create: {
        slug,
        name: slug
          .split("-")
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        type: "GENRE",
        isAdult: false,
        order: 0,
      },
      update: {},
    });
  }
}

async function linkCompanionCategories(
  companionId: string,
  categorySlugs: string[],
) {
  if (!(await categoryModelExists())) return;

  const uniq = Array.from(new Set(categorySlugs));
  const categories = await (prisma as any).category.findMany({
    where: { slug: { in: uniq } },
    select: { id: true, slug: true },
  });

  // Clear existing links and re-create (simple + deterministic).
  await (prisma as any).companionCategory.deleteMany({
    where: { companionId },
  });

  for (const cat of categories) {
    await (prisma as any).companionCategory.create({
      data: { companionId, categoryId: cat.id },
    });
  }
}

async function main() {
  const file =
    process.env.IMPORT_FILE ??
    path.resolve(process.cwd(), "data/companions.json");
  const raw = readJsonFile<unknown>(file);

  const parsed = z.array(CompanionImportSchema).safeParse(raw);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    process.exit(1);
  }

  let count = 0;

  for (const c of parsed.data) {
    assertNoBannedContent(c);

    await ensureCategories(c.categories);

    // Upsert companion (PUBLIC templates have ownerId = null)
    const companion = await prisma.companion.upsert({
      where: { slug: c.slug },
      create: {
        ownerId: null,
        name: c.name,
        slug: c.slug,
        description: c.description,
        tags: c.tags,
        archetype: c.archetype ?? null,
        visibility: c.visibility as Visibility,
        contentRating: c.contentRating as ContentRating,
        profile: c.profile,
      },
      update: {
        name: c.name,
        description: c.description,
        tags: c.tags,
        archetype: c.archetype ?? null,
        visibility: c.visibility as Visibility,
        contentRating: c.contentRating as ContentRating,
        profile: c.profile,
      },
      select: { id: true, slug: true },
    });

    await linkCompanionCategories(companion.id, c.categories);

    count++;
    console.log(`Upserted: ${companion.slug}`);
  }

  console.log(`Imported companions: ${count}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
