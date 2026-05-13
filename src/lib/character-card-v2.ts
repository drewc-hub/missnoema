import { ContentRating } from "@prisma/client";
import { CompanionProfileSchema, type CompanionProfile } from "@/lib/companion-profile";

export type CharacterCardV2 = {
  spec?: "chara_card_v2";
  spec_version?: "2.0" | string;
  data?: {
    name?: string;
    description?: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    mes_example?: string;
    creator_notes?: string;
    system_prompt?: string;
    post_history_instructions?: string;
    alternate_greetings?: string[];
    tags?: string[];
    creator?: string;
    character_version?: string;
    extensions?: Record<string, unknown>;
    character_book?: CharacterBook;
  };
};

export type CharacterBook = {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  entries?: CharacterBookEntry[];
};

export type CharacterBookEntry = {
  keys?: string[];
  content?: string;
  enabled?: boolean;
  insertion_order?: number;
  comment?: string;
  name?: string;
  extensions?: Record<string, unknown>;
};

export type CompanionCardExportInput = {
  name: string;
  description: string;
  tags: string[];
  contentRating?: ContentRating;
  profile: unknown;
};

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean)
    : [];
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function loreFromBook(book: CharacterBook | undefined) {
  const entries = Array.isArray(book?.entries) ? book.entries : [];
  return entries
    .filter((entry) => entry.enabled !== false && asString(entry.content))
    .sort((a, b) => Number(a.insertion_order ?? 0) - Number(b.insertion_order ?? 0))
    .map((entry) => {
      const label = asString(entry.name) || asString(entry.comment) || asString(entry.keys?.[0]) || "Lore";
      return `${label}: ${asString(entry.content)}`;
    })
    .join("\n\n");
}

function dialogueTreeFromExamples(exampleText: string) {
  if (!exampleText) return { startNodeId: "", nodes: [] };
  return {
    startNodeId: "example-dialogue",
    nodes: [
      {
        id: "example-dialogue",
        text: exampleText.slice(0, 2000),
        choices: [],
      },
    ],
  };
}

function characterBookFromProfile(profile: CompanionProfile): CharacterBook | undefined {
  const entries: CharacterBookEntry[] = [];
  if (profile.lore) {
    entries.push({
      keys: ["lore", profile.identity?.archetype].filter((value): value is string => typeof value === "string" && value.length > 0),
      content: profile.lore,
      enabled: true,
      insertion_order: 0,
      name: "Lore",
    });
  }
  if (profile.background) {
    entries.push({
      keys: ["background"],
      content: profile.background,
      enabled: true,
      insertion_order: 1,
      name: "Background",
    });
  }
  if (entries.length === 0) return undefined;
  return {
    name: `${profile.identity?.archetype ?? "Companion"} Lore`,
    description: "Lore exported from Noema companion profile.",
    scan_depth: 4,
    token_budget: 1200,
    recursive_scanning: false,
    entries,
  };
}

export function companionCreateInputFromCharacterCard(
  card: CharacterCardV2,
  options: { contentRating?: ContentRating; visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE" } = {},
) {
  const data = asObject(card.data);
  const name = asString(data.name) || "Imported Companion";
  const description =
    asString(data.description) ||
    asString(data.personality) ||
    "Imported Character Card V2 companion.";
  const personality = asString(data.personality) || asString(data.description);
  const scenario = asString(data.scenario);
  const firstMessage = asString(data.first_mes);
  const exampleDialogue = asString(data.mes_example);
  const creatorNotes = asString(data.creator_notes);
  const systemPrompt = asString(data.system_prompt);
  const tags = asStringArray(data.tags);
  const extensions = asObject(data.extensions);
  const book = asObject(data.character_book) as CharacterBook;
  const lore = [creatorNotes, loreFromBook(book)].filter(Boolean).join("\n\n");
  const noema = asObject(extensions.noema);
  const rating =
    options.contentRating ??
    (asString(noema.contentRating).toUpperCase() === "ADULT" ? ContentRating.ADULT : ContentRating.SAFE);

  const profile = CompanionProfileSchema.parse({
    premiumOnly: false,
    scene: scenario || firstMessage,
    background: description,
    personality,
    wardrobe: "",
    traits: tags.slice(0, 10),
    boundaries:
      rating === ContentRating.ADULT
        ? ["adults only", "no minors", "no coercion", "no non-consensual content", "no incest"]
        : ["no minors", "no explicit sexual content", "no coercion"],
    voice: null,
    sexuality: null,
    voiceMeta: { voiceId: "", accent: "", tone: "", language: "" },
    behaviorMeta: {
      voiceStyle: "",
      speechPattern: "character-card faithful, immersive, and continuous",
      emojiUsage: "match the imported character voice",
      attachmentStyle: "",
      temperament: "",
      traumaProfile: "",
      humorStyle: "",
      jealousyLevel: 20,
      dominanceLevel: 20,
      affectionLevel: 60,
    },
    nsfwPreferenceTags: rating === ContentRating.ADULT ? tags.filter((tag) => /adult|nsfw|domin|kink|bdsm|sensual/i.test(tag)) : [],
    aiPersonalityPrompt: systemPrompt,
    stats: {},
    avatarImageUrl: "",
    lore,
    orientation: "",
    bucket: rating === ContentRating.ADULT ? "ADULT_CARD_IMPORT" : "SAFE_CARD_IMPORT",
    identity: {
      source: "character_card_v2",
      creator: asString(data.creator),
      version: asString(data.character_version),
      archetype: tags[0] ?? null,
    },
    promptProfile: [firstMessage, exampleDialogue].filter(Boolean).join("\n\n"),
    factionAffiliations: [],
    relationshipProgression: { stage: "STRANGER", points: 0, milestones: [] },
    proceduralLore: {
      seed: slugify(name),
      worldHint: scenario,
      tone: rating === ContentRating.ADULT ? "adult imported character card" : "imported character card",
      factions: [],
      generated: [],
    },
    dialogueTree: dialogueTreeFromExamples(exampleDialogue),
    matchmaking: {
      seekingTags: tags,
      avoidTags: [],
      weights: { personality: 1.4, tags: 1.4, affinity: 1.1 },
    },
    sliders: {
      warmth: 60,
      humor: tags.some((tag) => /funny|humor|witty|banter/i.test(tag)) ? 70 : 45,
      flirtiness: tags.some((tag) => /flirt|romance|sensual/i.test(tag)) ? 55 : 20,
      dominance: tags.some((tag) => /dominant|assertive|commanding/i.test(tag)) ? 70 : 25,
      kink: rating === ContentRating.ADULT && tags.some((tag) => /kink|bdsm|domin/i.test(tag)) ? 55 : 0,
    },
    openingLine: firstMessage,
    style: "character-card-v2",
  });

  return {
    name,
    slug: slugify(name),
    description: description.slice(0, 1000),
    tags,
    archetype: tags[0] ?? null,
    contentRating: rating,
    visibility: options.visibility ?? "UNLISTED",
    profile,
  };
}

export function characterCardFromCompanion(companion: CompanionCardExportInput): CharacterCardV2 {
  const profile = CompanionProfileSchema.parse(companion.profile ?? {});
  const rawProfile = asObject(companion.profile);
  const characterBook = characterBookFromProfile(profile);
  const extensions: Record<string, unknown> = {
    noema: {
      exportedAt: new Date().toISOString(),
      contentRating:
        companion.contentRating ??
        (profile.bucket?.includes("ADULT") ? ContentRating.ADULT : ContentRating.SAFE),
      profile,
    },
  };
  const openingLine = asString(rawProfile.openingLine);

  return {
    spec: "chara_card_v2",
    spec_version: "2.0",
    data: {
      name: companion.name,
      description: companion.description,
      personality: profile.personality || companion.description,
      scenario: profile.scene,
      first_mes: openingLine || profile.promptProfile || profile.scene,
      mes_example: profile.dialogueTree.nodes?.[0]?.text ?? "",
      creator_notes: profile.lore,
      system_prompt: profile.aiPersonalityPrompt,
      post_history_instructions: profile.promptProfile,
      alternate_greetings: [],
      tags: companion.tags,
      creator: "Noema",
      character_version: "1.0.0",
      extensions,
      ...(characterBook ? { character_book: characterBook } : {}),
    },
  };
}
