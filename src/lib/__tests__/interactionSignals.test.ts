import { describe, it, expect } from "vitest";
import {
  getInteractionSignal,
  getAccessState,
  updateRuntimeState,
  buildGateInstruction,
  type CharacterGateProfile,
  type CharacterRuntimeState,
} from "../interactionSignals";

const baseCharacter: CharacterGateProfile = {
  role: "guard",
  absoluteNo: ["violence", "illegal"],
  slowZones: ["secret"],
  secretZones: ["hidden"],
  adaptationSpeed: "medium",
};

describe("getInteractionSignal", () => {
  it("returns STOP when requestedTier exceeds platformMaxTier", () => {
    expect(
      getInteractionSignal({
        userText: "hello",
        character: baseCharacter,
        platformMaxTier: 2,
        requestedTier: 3,
      })
    ).toBe("STOP");
  });

  it("returns STOP when absoluteNo term is in text", () => {
    expect(
      getInteractionSignal({
        userText: "let's commit violence",
        character: baseCharacter,
        platformMaxTier: 5,
        requestedTier: 1,
      })
    ).toBe("STOP");
  });

  it("returns SLOW when slowZone term is in text", () => {
    expect(
      getInteractionSignal({
        userText: "tell me a secret",
        character: baseCharacter,
        platformMaxTier: 5,
        requestedTier: 1,
      })
    ).toBe("SLOW");
  });

  it("returns SLOW when secretZone term is in text", () => {
    expect(
      getInteractionSignal({
        userText: "what's hidden here?",
        character: baseCharacter,
        platformMaxTier: 5,
        requestedTier: 1,
      })
    ).toBe("SLOW");
  });

  it("returns GO for normal text", () => {
    expect(
      getInteractionSignal({
        userText: "hello, how are you?",
        character: baseCharacter,
        platformMaxTier: 5,
        requestedTier: 1,
      })
    ).toBe("GO");
  });

  it("absoluteNo check is case-insensitive", () => {
    expect(
      getInteractionSignal({
        userText: "VIOLENCE is bad",
        character: baseCharacter,
        platformMaxTier: 5,
        requestedTier: 1,
      })
    ).toBe("STOP");
  });
});

describe("getAccessState", () => {
  it("returns LOCKED when suspicionScore >= 0.7", () => {
    expect(getAccessState({ trustScore: 0.9, suspicionScore: 0.7 })).toBe("LOCKED");
    expect(getAccessState({ trustScore: 0.9, suspicionScore: 0.8 })).toBe("LOCKED");
  });

  it("returns OPEN when trust >= 0.65 and suspicion < 0.45", () => {
    expect(getAccessState({ trustScore: 0.65, suspicionScore: 0.4 })).toBe("OPEN");
    expect(getAccessState({ trustScore: 0.9, suspicionScore: 0.0 })).toBe("OPEN");
  });

  it("returns TESTING otherwise", () => {
    expect(getAccessState({ trustScore: 0.3, suspicionScore: 0.3 })).toBe("TESTING");
    expect(getAccessState({ trustScore: 0.65, suspicionScore: 0.5 })).toBe("TESTING");
  });
});

describe("updateRuntimeState", () => {
  const start: CharacterRuntimeState = { trustScore: 0.5, suspicionScore: 0.5 };

  it("baseline trust increases and suspicion decreases slightly", () => {
    const next = updateRuntimeState({ userText: "hello", previous: start });
    expect(next.trustScore).toBeGreaterThan(start.trustScore);
    expect(next.suspicionScore).toBeLessThan(start.suspicionScore);
  });

  it("suspicious text raises suspicion more", () => {
    const next = updateRuntimeState({ userText: "prove it", previous: start });
    expect(next.suspicionScore).toBeGreaterThan(start.suspicionScore);
  });

  it("respectful text raises trust more", () => {
    const neutral = updateRuntimeState({ userText: "hello", previous: start });
    const respectful = updateRuntimeState({ userText: "may i ask?", previous: start });
    expect(respectful.trustScore).toBeGreaterThan(neutral.trustScore);
  });

  it("scores are clamped to 0..1", () => {
    const high: CharacterRuntimeState = { trustScore: 1, suspicionScore: 1 };
    const next = updateRuntimeState({ userText: "prove it", previous: high });
    expect(next.suspicionScore).toBeLessThanOrEqual(1);
    expect(next.trustScore).toBeGreaterThanOrEqual(0);

    const low: CharacterRuntimeState = { trustScore: 0, suspicionScore: 0 };
    const next2 = updateRuntimeState({ userText: "consent", previous: low });
    expect(next2.trustScore).toBeGreaterThanOrEqual(0);
    expect(next2.suspicionScore).toBeGreaterThanOrEqual(0);
  });
});

describe("buildGateInstruction", () => {
  it("returns STOP instruction for STOP signal", () => {
    const result = buildGateInstruction({ signal: "STOP", accessState: "OPEN", role: "guard" });
    expect(result).toContain("hard boundary");
    expect(result).toContain("guard");
  });

  it("returns LOCKED instruction when accessState is LOCKED (non-STOP signal)", () => {
    const result = buildGateInstruction({ signal: "GO", accessState: "LOCKED", role: "guard" });
    expect(result).toContain("distrust");
  });

  it("returns TESTING instruction when accessState is TESTING", () => {
    const result = buildGateInstruction({ signal: "GO", accessState: "TESTING", role: "guard" });
    expect(result).toContain("trust");
    expect(result).toContain("guard");
  });

  it("returns OPEN instruction when signal is GO and state is OPEN", () => {
    const result = buildGateInstruction({ signal: "GO", accessState: "OPEN", role: "guard" });
    expect(result).toContain("allowed");
  });

  it("STOP signal takes priority over LOCKED state", () => {
    const result = buildGateInstruction({ signal: "STOP", accessState: "LOCKED", role: "guard" });
    expect(result).toContain("hard boundary");
  });
});
