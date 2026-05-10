import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Banned theme filters — checked on every user message, generation prompt,
// and companion creation. Returns the first matched category or null.
// ---------------------------------------------------------------------------

const BANNED_THEME_FILTERS: { category: string; patterns: RegExp[] }[] = [
  {
    // Sexual content involving minors
    category: "underage_content",
    patterns: [
      // Unambiguous minor-sexualisation terms (always banned regardless of context)
      /\b(loli(ta)?|shota)\b/,
      /\b(p[e3]do|p[e3]dophil[e3]?|p[e3]dophilia|paedophil[e3]?|paedophilia)\b/,
      /\b(csam|childporn|child\s+porn)\b/,
      /\bjailbait\b/,
      // "minor / underage" within 80 chars of explicit sexual terms
      /\b(minor|underage|under[- ]?age|preteen|pre[- ]?teen)\b[\s\S]{0,80}\b(sex|fuck|nude|naked|explicit|porn|genital|penetrat|erotic)\b/,
      /\b(sex|fuck|nude|naked|explicit|porn|genital|penetrat|erotic)\b[\s\S]{0,80}\b(minor|underage|under[- ]?age|preteen|pre[- ]?teen)\b/,
      // Ages 10–17 within 80 chars of explicit sexual terms
      /\b1[0-7]\s*year[s]?\s*old\b[\s\S]{0,80}\b(sex|fuck|nude|naked|explicit|porn|erotic)\b/,
      /\b(sex|fuck|nude|naked|explicit|porn|erotic)\b[\s\S]{0,80}\b1[0-7]\s*year[s]?\s*old\b/,
    ],
  },
  {
    // Non-consensual sexual content
    category: "non_consent",
    patterns: [
      // "rape" and common leetspeak variants
      /\br[a@4]p[e3](d|s|ing|ist)?\b/,
      /\bnon[- ]?consensual\b/,
      /\bsexual(?:ly)?\s+assault(?:ed|ing|s)?\b/,
      // Force + sexual act directed at a person
      /\bforc(?:e[sd]?|ing)\s+(?:her|him|them|you)\s+to\s+(?:have\s+sex|fuck|suck|give\s+head|perform\s+oral)\b/,
    ],
  },
];

export type BannedThemeResult =
  | { blocked: false; category: null }
  | { blocked: true; category: string };

export function checkBannedThemes(text: string): BannedThemeResult {
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  for (const filter of BANNED_THEME_FILTERS) {
    if (filter.patterns.some((p) => p.test(normalized))) {
      return { blocked: true, category: filter.category };
    }
  }
  return { blocked: false, category: null };
}

// ---------------------------------------------------------------------------
// Audit logging — fire-and-forget; never throws
// ---------------------------------------------------------------------------

export function logAudit(
  userId: string,
  action: string,
  metadata?: Record<string, unknown>,
  ip?: string,
  platform?: string,
): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma.auditLog
    .create({ data: { user_id: userId, action, metadata: (metadata ?? {}) as any, ip, platform } })
    .catch(() => {});
}
