import { describe, it, expect } from "vitest";
import { ContentRating, Visibility } from "@prisma/client";
import {
  isAdultAllowed,
  requireAdultAllowed,
  coerceRating,
  coerceVisibility,
} from "../ratings";

describe("isAdultAllowed", () => {
  it("returns false for null user", () => {
    expect(isAdultAllowed(null)).toBe(false);
  });

  it("returns false when ageVerifiedAt is null", () => {
    expect(isAdultAllowed({ ageVerifiedAt: null })).toBe(false);
  });

  it("returns false when ageVerifiedAt is undefined", () => {
    expect(isAdultAllowed({ ageVerifiedAt: undefined })).toBe(false);
  });

  it("returns true when ageVerifiedAt is a date", () => {
    expect(isAdultAllowed({ ageVerifiedAt: new Date() })).toBe(true);
  });
});

describe("requireAdultAllowed", () => {
  it("throws 403 error when not allowed", () => {
    expect(() => requireAdultAllowed(null)).toThrow("Age verification required");
    try {
      requireAdultAllowed(null);
    } catch (e: any) {
      expect(e.status).toBe(403);
    }
  });

  it("does not throw when age is verified", () => {
    expect(() => requireAdultAllowed({ ageVerifiedAt: new Date() })).not.toThrow();
  });
});

describe("coerceRating", () => {
  it("returns ADULT for 'adult' (case-insensitive)", () => {
    expect(coerceRating("adult")).toBe(ContentRating.ADULT);
    expect(coerceRating("ADULT")).toBe(ContentRating.ADULT);
    expect(coerceRating("Adult")).toBe(ContentRating.ADULT);
  });

  it("returns SAFE for anything else", () => {
    expect(coerceRating("safe")).toBe(ContentRating.SAFE);
    expect(coerceRating("SAFE")).toBe(ContentRating.SAFE);
    expect(coerceRating("unknown")).toBe(ContentRating.SAFE);
    expect(coerceRating(null)).toBe(ContentRating.SAFE);
    expect(coerceRating(undefined)).toBe(ContentRating.SAFE);
  });
});

describe("coerceVisibility", () => {
  it("returns PRIVATE for 'private'", () => {
    expect(coerceVisibility("private")).toBe(Visibility.PRIVATE);
    expect(coerceVisibility("PRIVATE")).toBe(Visibility.PRIVATE);
  });

  it("returns UNLISTED for 'unlisted'", () => {
    expect(coerceVisibility("unlisted")).toBe(Visibility.UNLISTED);
    expect(coerceVisibility("UNLISTED")).toBe(Visibility.UNLISTED);
  });

  it("returns PUBLIC for 'public'", () => {
    expect(coerceVisibility("public")).toBe(Visibility.PUBLIC);
    expect(coerceVisibility("PUBLIC")).toBe(Visibility.PUBLIC);
  });

  it("returns fallback for unknown values", () => {
    expect(coerceVisibility("garbage")).toBe(Visibility.PUBLIC);
    expect(coerceVisibility(undefined, Visibility.PRIVATE)).toBe(Visibility.PRIVATE);
  });

  it("defaults fallback to PUBLIC", () => {
    expect(coerceVisibility("???")).toBe(Visibility.PUBLIC);
  });
});
