import { describe, expect, it } from "vitest";
import { applyLessonCompletion, localDateString, type StreakState } from "./streak";

const base: StreakState = { currentCount: 0, freezeBalance: 0, lastActiveDate: null };

describe("localDateString", () => {
  it("returns the calendar date in the given timezone", () => {
    // 2026-01-01 05:00 UTC is still 2025-12-31 evening in Los Angeles.
    const date = new Date("2026-01-01T05:00:00Z");
    expect(localDateString(date, "UTC")).toBe("2026-01-01");
    expect(localDateString(date, "America/Los_Angeles")).toBe("2025-12-31");
  });
});

describe("applyLessonCompletion", () => {
  it("starts a streak at 1 on the first-ever completion", () => {
    const result = applyLessonCompletion(base, "2026-03-01");
    expect(result).toMatchObject({
      currentCount: 1,
      lastActiveDate: "2026-03-01",
      streakBroken: false,
    });
  });

  it("does not double-count a second completion on the same day", () => {
    const state: StreakState = {
      currentCount: 3,
      freezeBalance: 0,
      lastActiveDate: "2026-03-01",
    };
    const result = applyLessonCompletion(state, "2026-03-01");
    expect(result.currentCount).toBe(3);
    expect(result.streakBroken).toBe(false);
  });

  it("increments on a consecutive day", () => {
    const state: StreakState = {
      currentCount: 3,
      freezeBalance: 0,
      lastActiveDate: "2026-03-01",
    };
    const result = applyLessonCompletion(state, "2026-03-02");
    expect(result.currentCount).toBe(4);
    expect(result.lastActiveDate).toBe("2026-03-02");
    expect(result.streakBroken).toBe(false);
  });

  it("earns a freeze every 7th consecutive day", () => {
    const state: StreakState = {
      currentCount: 6,
      freezeBalance: 0,
      lastActiveDate: "2026-03-06",
    };
    const result = applyLessonCompletion(state, "2026-03-07");
    expect(result.currentCount).toBe(7);
    expect(result.freezeEarned).toBe(true);
    expect(result.freezeBalance).toBe(1);
  });

  it("consumes a freeze to cover exactly one missed day", () => {
    const state: StreakState = {
      currentCount: 10,
      freezeBalance: 1,
      lastActiveDate: "2026-03-01",
    };
    // 2026-03-03 is a 2-day gap: 03-02 was missed.
    const result = applyLessonCompletion(state, "2026-03-03");
    expect(result.streakBroken).toBe(false);
    expect(result.freezeConsumed).toBe(true);
    expect(result.currentCount).toBe(11);
    expect(result.freezeBalance).toBe(0);
  });

  it("breaks the streak on a missed day with no freeze available", () => {
    const state: StreakState = {
      currentCount: 10,
      freezeBalance: 0,
      lastActiveDate: "2026-03-01",
    };
    const result = applyLessonCompletion(state, "2026-03-03");
    expect(result.streakBroken).toBe(true);
    expect(result.currentCount).toBe(1);
  });

  it("breaks the streak on a gap larger than one freeze can cover, even with a freeze banked", () => {
    const state: StreakState = {
      currentCount: 10,
      freezeBalance: 3,
      lastActiveDate: "2026-03-01",
    };
    // Three days missed — a freeze only ever covers one.
    const result = applyLessonCompletion(state, "2026-03-05");
    expect(result.streakBroken).toBe(true);
    expect(result.currentCount).toBe(1);
    expect(result.freezeBalance).toBe(3); // unspent freezes aren't lost on a break
  });
});
