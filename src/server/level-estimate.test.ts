import { describe, expect, it } from "vitest";
import { estimateLevel, levelFromKnownWordCount, maxLevel } from "./level-estimate";

describe("levelFromKnownWordCount", () => {
  it.each([
    [0, "A1"],
    [49, "A1"],
    [50, "A2"],
    [149, "A2"],
    [150, "B1"],
    [700, "C1"],
    [1500, "C2"],
  ] as const)("count %i -> %s", (count, expected) => {
    expect(levelFromKnownWordCount(count)).toBe(expected);
  });
});

describe("estimateLevel", () => {
  it("falls back to the word-count level with no completions", () => {
    const result = estimateLevel({ knownWordCount: 5, completedLessonCountByLevel: {} });
    expect(result.level).toBe("A1");
  });

  it("bumps the estimate up when the learner is comfortable at a higher level than their word count implies", () => {
    const result = estimateLevel({
      knownWordCount: 10, // word-count alone says A1
      completedLessonCountByLevel: { A1: 5, A2: 2 },
    });
    expect(result.level).toBe("A2");
  });

  it("never lets a low completion count override a high word-count level", () => {
    const result = estimateLevel({
      knownWordCount: 800, // word-count alone says C1
      completedLessonCountByLevel: { A1: 3 },
    });
    expect(result.level).toBe("C1");
  });

  it("requires more than one completion to count as comfortable", () => {
    const result = estimateLevel({
      knownWordCount: 5,
      completedLessonCountByLevel: { B1: 1 },
    });
    expect(result.level).toBe("A1");
  });
});

describe("maxLevel", () => {
  it("returns the higher of two levels regardless of argument order", () => {
    expect(maxLevel("A1", "B1")).toBe("B1");
    expect(maxLevel("B1", "A1")).toBe("B1");
  });

  it("returns the same level when both are equal", () => {
    expect(maxLevel("C1", "C1")).toBe("C1");
  });
});
