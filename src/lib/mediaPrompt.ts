type Intensity = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Map trust + intimacy scores (0–100 each) to an intensity level
 * in the range [0, platformMax].
 */
export function getMediaIntensity(args: {
  trust: number;
  intimacy: number;
  platformMax: number;
}): Intensity {
  const { trust, intimacy, platformMax } = args;
  const avg = (trust + intimacy) / 2;
  // Scale 0–100 average to 0–platformMax, clamp to valid Intensity range.
  const raw = Math.round((avg / 100) * platformMax);
  return Math.max(0, Math.min(5, Math.min(platformMax, raw))) as Intensity;
}

/**
 * Return the coin cost for a generation job.
 * Video costs more than image; higher intensity costs more.
 */
export function getMediaCost(
  intensity: Intensity | number,
  type: "image" | "video",
): number {
  const base = type === "video" ? 20 : 5;
  const perLevel = type === "video" ? 10 : 3;
  return base + intensity * perLevel;
}

export function buildMediaPrompt(args: {
  companion: {
    name: string;
    description: string;
  };
  userPrompt: string;
  intensity: Intensity;
}) {
  const { companion, userPrompt, intensity } = args;

  const identityLayer = `
same woman, consistent face, consistent body type, same hair style, same identity across images
`;

  const styleLayer = `
editorial fashion photography, high-end magazine, 85mm lens, cinematic lighting, sharp focus
`;

  const base = `
${companion.description}

highly realistic, cinematic lighting, detailed skin, soft shadows, professional photography
`;

  const intensityLayer = {
    0: `
fully clothed, casual setting, neutral mood, natural pose
`,
    1: `
stylish outfit, strong attitude, confident posture, expressive personality, fashion-forward
`,
    2: `
elegant lingerie, sensual mood, soft gaze, intimate atmosphere, moody lighting, emotionally charged
`,
    3: `
artistic pose, deliberate framing, strong eye contact, body language as expression, suggestive but tasteful, no explicit content
`,
    4: `
confident pose, semi-explicit framing, implied nudity, artistic composition, suggestive body language, intimate and bold
`,
    5: `
explicit pose, direct framing, nudity, raw and unfiltered composition, bold body language, unapologetically intimate
`,
  }[intensity];

  return `
${base}

Mood:
${intensityLayer}

Scene:
${userPrompt}

Constraints:
no explicit sexual acts, no graphic anatomy, tasteful, artistic composition
`;
}
