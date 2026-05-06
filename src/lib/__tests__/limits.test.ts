import { describe, it, expect } from "vitest";
import { getLimits, LIMITS } from "../limits";

describe("getLimits", () => {
  it("returns null for null tier", () => {
    expect(getLimits(null)).toBeNull();
  });

  it("returns premium limits", () => {
    const limits = getLimits("premium");
    expect(limits).toEqual(LIMITS.premium);
    expect(limits?.companions).toBe(10);
    expect(limits?.messages).toBe(5000);
    expect(limits?.images).toBe(50);
    expect(limits?.videos).toBe(5);
  });

  it("returns premium_plus limits", () => {
    const limits = getLimits("premium_plus");
    expect(limits).toEqual(LIMITS.premium_plus);
    expect(limits?.companions).toBe(25);
    expect(limits?.messages).toBe(Infinity);
    expect(limits?.images).toBe(200);
    expect(limits?.videos).toBe(25);
  });

  it("premium_plus has unlimited messages", () => {
    const limits = getLimits("premium_plus");
    expect(limits?.messages).toBe(Infinity);
  });
});
