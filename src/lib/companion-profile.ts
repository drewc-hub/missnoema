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
  scene: z.string().optional().default(""),
  background: z.string().optional().default(""),
  personality: z.string().optional().default(""),
  wardrobe: z.string().optional().default(""),
  traits: z.array(z.string()).optional().default([]),
  boundaries: z.array(z.string()).optional().default([]),
  voice: z.string().optional().nullable(),
  sexuality: z.string().optional().nullable(),
  voiceMeta: VoiceMetaSchema,
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
