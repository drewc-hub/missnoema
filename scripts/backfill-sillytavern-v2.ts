import { Prisma, PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isSillyTavernV2(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;

  const card = value as Record<string, unknown>;
  return (
    card.spec === "chara_card_v2" &&
    typeof card.spec_version === "string" &&
    Boolean(card.data) &&
    typeof card.data === "object" &&
    !Array.isArray(card.data)
  );
}

function buildSillyTavernV2(companion: any) {
  const profile = companion.profile ?? {};

  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: companion.name,
      description:
        profile.background ||
        companion.description ||
        "",
      personality:
        profile.personality ||
        companion.personality ||
        "",
      scenario:
        profile.scene ||
        companion.scene ||
        "",
      first_mes:
        profile.firstMessage ||
        `*${companion.name} notices you arrive and turns toward you.*`,
      mes_example:
        profile.exampleDialogue || "",
      creator_notes:
        `Generated for Noema. Content rating: ${companion.contentRating ?? "SAFE"}`,
      system_prompt:
        profile.systemPrompt ||
        `Stay in character as ${companion.name}. Maintain emotional continuity, remember established facts, and respond naturally.`,
      post_history_instructions:
        "Use the conversation history and memory context to maintain continuity.",
      tags: companion.tags ?? [],
      creator: "Noema",
      character_version: "1.0",
      alternate_greetings: profile.alternateGreetings ?? [],
      extensions: {
        noema: {
          slug: companion.slug,
          archetype: companion.archetype,
          contentRating: companion.contentRating,
          gender: companion.gender,
          age: companion.age,
          orientation: companion.orientation,
          traits: companion.traits ?? profile.traits ?? [],
          wardrobe: companion.wardrobe ?? profile.wardrobe,
          relationship_dynamic: companion.relationship_dynamic ?? null,
          kink_adjacency: companion.kink_adjacency ?? null,
          boundaries: companion.boundaries ?? profile.boundaries ?? null,
        },
      },
    },
  };
}

async function main() {
  const companions = await prisma.companion.findMany({
    where: {
      sillyTavernCard: { equals: Prisma.DbNull },
    },
  });

  console.log(`Found ${companions.length} companions to backfill.`);

  let backfilled = 0;
  let skipped = 0;

  for (const companion of companions) {
    if (isSillyTavernV2(companion.sillyTavernCard)) {
      skipped += 1;
      console.log(`Skipped existing V2 card: ${companion.name}`);
      continue;
    }

    const card = buildSillyTavernV2(companion);

    const result = await prisma.companion.updateMany({
      where: {
        id: companion.id,
        sillyTavernCard: { equals: Prisma.DbNull },
      },
      data: {
        sillyTavernCard: card,
      },
    });

    if (result.count === 0) {
      skipped += 1;
      console.log(`Skipped existing card: ${companion.name}`);
      continue;
    }

    backfilled += 1;
    console.log(`Backfilled: ${companion.name}`);
  }

  console.log(`Done. Backfilled: ${backfilled}. Skipped: ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
