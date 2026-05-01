// file: src/lib/validate.ts
import { z } from "zod";

export const SlugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Invalid slug. Use lowercase letters, numbers, and hyphens only.",
  );

export const CsvSchema = z.string().optional();

export function parseCsv(v?: string) {
  return (v ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

export function parseTags(v?: string, max = 24) {
  return parseCsv(v).slice(0, max);
}

export function parseTraits(v?: string, max = 24) {
  return parseCsv(v).slice(0, max);
}

export function num01(v: unknown, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}
