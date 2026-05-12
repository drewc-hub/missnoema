type MatchmakingProfile = {
  seekingTags?: string[];
  avoidTags?: string[];
  weights?: {
    personality?: number;
    tags?: number;
    affinity?: number;
  };
};

export function scoreCompanionMatch(args: {
  preferredTags: Map<string, number>;
  preferredArchetypes: Map<string, number>;
  companionTags: string[];
  companionArchetype: string | null;
  profile: unknown;
  relationshipBonus?: number;
}) {
  const {
    preferredTags,
    preferredArchetypes,
    companionTags,
    companionArchetype,
    profile,
    relationshipBonus = 0,
  } = args;

  const meta =
    profile && typeof profile === "object"
      ? (profile as Record<string, unknown>)
      : {};
  const matchmaking =
    meta.matchmaking && typeof meta.matchmaking === "object"
      ? (meta.matchmaking as MatchmakingProfile)
      : {};

  const weights = {
    personality: Number(matchmaking.weights?.personality ?? 1.2),
    tags: Number(matchmaking.weights?.tags ?? 1.4),
    affinity: Number(matchmaking.weights?.affinity ?? 1.0),
  };

  let score = 0;
  const reasons: string[] = [];

  for (const tag of companionTags) {
    const normalized = tag.toLowerCase();
    const pref = preferredTags.get(normalized) ?? 0;
    if (pref > 0) {
      score += pref * weights.tags;
    }
  }
  if (score > 0) {
    reasons.push("tag affinity");
  }

  if (companionArchetype) {
    const a = preferredArchetypes.get(companionArchetype.toLowerCase()) ?? 0;
    if (a > 0) {
      score += a * weights.personality;
      reasons.push("archetype affinity");
    }
  }

  const seeking = (matchmaking.seekingTags ?? []).map((t) => t.toLowerCase());
  const avoid = (matchmaking.avoidTags ?? []).map((t) => t.toLowerCase());

  const overlap = companionTags
    .map((t) => t.toLowerCase())
    .filter((t) => seeking.includes(t)).length;
  if (overlap > 0) {
    score += overlap * 3;
    reasons.push("profile targeting");
  }

  const avoidOverlap = companionTags
    .map((t) => t.toLowerCase())
    .filter((t) => avoid.includes(t)).length;
  if (avoidOverlap > 0) {
    score -= avoidOverlap * 4;
  }

  if (relationshipBonus > 0) {
    score += relationshipBonus * weights.affinity;
    reasons.push("relationship progression");
  }

  return {
    score,
    reasons: [...new Set(reasons)],
  };
}
