import { describe, it, expect } from "vitest";
import { SlugSchema, parseCsv, parseTags, parseTraits, num01 } from "../validate";

describe("SlugSchema", () => {
  it("accepts valid slugs", () => {
    expect(SlugSchema.safeParse("hello-world").success).toBe(true);
    expect(SlugSchema.safeParse("abc123").success).toBe(true);
    expect(SlugSchema.safeParse("a1-b2-c3").success).toBe(true);
  });

  it("rejects slugs that are too short", () => {
    expect(SlugSchema.safeParse("a").success).toBe(false);
  });

  it("rejects slugs that are too long", () => {
    expect(SlugSchema.safeParse("a".repeat(81)).success).toBe(false);
  });

  it("rejects uppercase letters", () => {
    expect(SlugSchema.safeParse("Hello").success).toBe(false);
  });

  it("rejects leading/trailing hyphens", () => {
    expect(SlugSchema.safeParse("-hello").success).toBe(false);
    expect(SlugSchema.safeParse("hello-").success).toBe(false);
  });

  it("rejects double hyphens", () => {
    expect(SlugSchema.safeParse("hello--world").success).toBe(false);
  });
});

describe("parseCsv", () => {
  it("splits on commas", () => {
    expect(parseCsv("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("trims whitespace", () => {
    expect(parseCsv(" a , b , c ")).toEqual(["a", "b", "c"]);
  });

  it("filters empty strings", () => {
    expect(parseCsv("a,,b")).toEqual(["a", "b"]);
  });

  it("returns empty array for undefined", () => {
    expect(parseCsv(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseCsv("")).toEqual([]);
  });
});

describe("parseTags", () => {
  it("applies default max of 24", () => {
    const input = Array.from({ length: 30 }, (_, i) => `tag${i}`).join(",");
    expect(parseTags(input)).toHaveLength(24);
  });

  it("respects custom max", () => {
    expect(parseTags("a,b,c,d,e", 3)).toEqual(["a", "b", "c"]);
  });
});

describe("parseTraits", () => {
  it("applies default max of 24", () => {
    const input = Array.from({ length: 30 }, (_, i) => `trait${i}`).join(",");
    expect(parseTraits(input)).toHaveLength(24);
  });
});

describe("num01", () => {
  it("clamps to 0..100 range", () => {
    expect(num01(-5, 50)).toBe(0);
    expect(num01(150, 50)).toBe(100);
    expect(num01(50, 0)).toBe(50);
  });

  it("rounds to nearest integer", () => {
    expect(num01(50.7, 0)).toBe(51);
    expect(num01(50.2, 0)).toBe(50);
  });

  it("returns fallback for non-numeric values", () => {
    expect(num01("nope", 42)).toBe(42);
    expect(num01(undefined, 10)).toBe(10);
    expect(num01(NaN, 5)).toBe(5);
  });

  it("treats null as 0 (Number(null) === 0)", () => {
    expect(num01(null, 7)).toBe(0);
  });

  it("handles numeric strings", () => {
    expect(num01("75", 0)).toBe(75);
  });
});
