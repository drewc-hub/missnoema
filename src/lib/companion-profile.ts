import { z } from "zod";

export const CompanionSlidersSchema = z
  .object({
    warmth: z.number().min(0).max(100).optional().default(50),
    humor: z.number().min(0).max(100).optional().default(50),
    flirtiness: z.number().min(0).max(100).optional().default(10),
    dominance: z.number().min(0).max(100).optional().default(20),
    kink: z.number().min(0).max(100).optional().default(0),
  })
  .optional()
  .default({
    warmth: 50,
    humor: 50,
    flirtiness: 10,
    dominance: 20,
    kink: 0,
  });

export const VoiceMetaSchema = z
  .object({
    voiceId: z.string().optional().default(""),
    accent: z.string().optional().default(""),
    tone: z.string().optional().default(""),
    language: z.string().optional().default(""),
  })
  .optional()
  .default({
    voiceId: "",
    accent: "",
    tone: "",
    language: "",
  });

export const BehaviorMetaSchema = z
  .object({
    voiceStyle: z.string().optional().default(""),
    speechPattern: z.string().optional().default(""),
    emojiUsage: z.string().optional().default(""),
    attachmentStyle: z.string().optional().default(""),
    temperament: z.string().optional().default(""),
    traumaProfile: z.string().optional().default(""),
    humorStyle: z.string().optional().default(""),
    jealousyLevel: z.number().min(0).max(100).optional().default(20),
    dominanceLevel: z.number().min(0).max(100).optional().default(20),
    affectionLevel: z.number().min(0).max(100).optional().default(60),
  })
  .optional()
  .default({
    voiceStyle: "",
    speechPattern: "",
    emojiUsage: "",
    attachmentStyle: "",
    temperament: "",
    traumaProfile: "",
    humorStyle: "",
    jealousyLevel: 20,
    dominanceLevel: 20,
    affectionLevel: 60,
  });

export const RelationshipProgressionSchema = z
  .object({
    stage: z.string().optional().default("STRANGER"),
    points: z.number().int().min(0).optional().default(0),
    milestones: z.array(z.string()).optional().default([]),
  })
  .optional()
  .default({
    stage: "STRANGER",
    points: 0,
    milestones: [],
  });

export const ProceduralLoreSchema = z
  .object({
    seed: z.string().optional().default(""),
    worldHint: z.string().optional().default(""),
    tone: z.string().optional().default(""),
    factions: z.array(z.string()).optional().default([]),
    generated: z.array(z.string()).optional().default([]),
  })
  .optional()
  .default({
    seed: "",
    worldHint: "",
    tone: "",
    factions: [],
    generated: [],
  });

export const DialogueTreeSchema = z
  .object({
    startNodeId: z.string().optional().default(""),
    nodes: z
      .array(
        z.object({
          id: z.string(),
          text: z.string(),
          choices: z
            .array(
              z.object({
                id: z.string(),
                label: z.string(),
                nextNodeId: z.string().optional().nullable(),
                affinityDelta: z.number().int().optional().default(0),
                reputation: z
                  .array(
                    z.object({
                      factionSlug: z.string(),
                      delta: z.number().int(),
                    }),
                  )
                  .optional()
                  .default([]),
              }),
            )
            .optional()
            .default([]),
        }),
      )
      .optional()
      .default([]),
  })
  .optional()
  .default({
    startNodeId: "",
    nodes: [],
  });

export const MatchmakingSchema = z
  .object({
    seekingTags: z.array(z.string()).optional().default([]),
    avoidTags: z.array(z.string()).optional().default([]),
    weights: z
      .object({
        personality: z.number().min(0).max(5).optional().default(1.2),
        tags: z.number().min(0).max(5).optional().default(1.4),
        affinity: z.number().min(0).max(5).optional().default(1.0),
      })
      .optional()
      .default({
        personality: 1.2,
        tags: 1.4,
        affinity: 1.0,
      }),
  })
  .optional()
  .default({
    seekingTags: [],
    avoidTags: [],
    weights: {
      personality: 1.2,
      tags: 1.4,
      affinity: 1.0,
    },
  });

export const CompanionProfileSchema = z.object({
  premiumOnly: z.boolean().optional().default(false),
  scene: z.string().optional().default(""),
  background: z.string().optional().default(""),
  personality: z.string().optional().default(""),
  wardrobe: z.string().optional().default(""),
  traits: z.array(z.string()).optional().default([]),
  boundaries: z.array(z.string()).optional().default([]),
  voice: z.string().optional().nullable(),
  sexuality: z.string().optional().nullable(),
  voiceMeta: VoiceMetaSchema,
  behaviorMeta: BehaviorMetaSchema,
  nsfwPreferenceTags: z.array(z.string()).optional().default([]),
  aiPersonalityPrompt: z.string().max(6000).optional().default(""),
  stats: z.record(z.string(), z.number().min(0).max(100)).optional().default({}),
  avatarImageUrl: z.string().optional().default(""),
  lore: z.string().optional().default(""),
  orientation: z.string().optional().default(""),
  bucket: z.string().optional().default(""),
  identity: z.record(z.string(), z.unknown()).optional().default({}),
  promptProfile: z.string().max(4000).optional().default(""),
  factionAffiliations: z
    .array(
      z.object({
        factionSlug: z.string(),
        standing: z.string().optional().default("neutral"),
        notes: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
  relationshipProgression: RelationshipProgressionSchema,
  proceduralLore: ProceduralLoreSchema,
  dialogueTree: DialogueTreeSchema,
  matchmaking: MatchmakingSchema,
  sliders: CompanionSlidersSchema,
});

export type CompanionProfile = z.infer<typeof CompanionProfileSchema>;
export type CompanionBehaviorMeta = z.infer<typeof BehaviorMetaSchema>;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getCompanionBehaviorMeta(profile: unknown): CompanionBehaviorMeta {
  const profileRecord = asRecord(profile);
  const behaviorRecord = asRecord(profileRecord.behaviorMeta);
  const sliders = asRecord(profileRecord.sliders);
  const voiceMeta = asRecord(profileRecord.voiceMeta);

  const parsed = BehaviorMetaSchema.parse(behaviorRecord);
  const voiceStyle =
    parsed.voiceStyle ||
    stringValue(profileRecord.voice) ||
    stringValue(voiceMeta.tone);

  return {
    ...parsed,
    voiceStyle,
    dominanceLevel: clampPercent(
      numberValue(behaviorRecord.dominanceLevel, numberValue(sliders.dominance, parsed.dominanceLevel)),
    ),
    affectionLevel: clampPercent(
      numberValue(behaviorRecord.affectionLevel, numberValue(sliders.warmth, parsed.affectionLevel)),
    ),
  };
}

export function formatBehaviorMetaForPrompt(profile: unknown) {
  const meta = getCompanionBehaviorMeta(profile);
  return [
    meta.voiceStyle && `Voice style: ${meta.voiceStyle}`,
    meta.speechPattern && `Speech pattern: ${meta.speechPattern}`,
    meta.emojiUsage && `Emoji usage: ${meta.emojiUsage}`,
    meta.attachmentStyle && `Attachment style: ${meta.attachmentStyle}`,
    meta.temperament && `Temperament: ${meta.temperament}`,
    meta.traumaProfile && `Trauma profile: ${meta.traumaProfile}`,
    meta.humorStyle && `Humor style: ${meta.humorStyle}`,
    `Jealousy: ${meta.jealousyLevel}/100`,
    `Dominance style: ${meta.dominanceLevel}/100`,
    `Affection style: ${meta.affectionLevel}/100`,
  ].filter(Boolean).join("\n");
}
