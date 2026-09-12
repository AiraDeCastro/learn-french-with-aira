/**
 * Pure streak-transition logic, kept separate from the database so the
 * trickiest part — date math across timezones and gaps — can be unit
 * tested directly (streak.test.ts) without spinning up Prisma for every
 * case. The router (progress.ts) only reads/writes the result.
 */

export type StreakState = {
  currentCount: number;
  freezeBalance: number;
  lastActiveDate: string | null; // "YYYY-MM-DD", the learner's local date
};

export type StreakUpdate = StreakState & {
  freezeConsumed: boolean;
  freezeEarned: boolean;
  streakBroken: boolean;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const FREEZE_EVERY_N_DAYS = 7;

/** The calendar date ("YYYY-MM-DD") that `date` falls on in `timeZone`. */
export function localDateString(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Whole days between two "YYYY-MM-DD" dates (b - a). Both are treated as UTC midnight so DST can't shift the count. */
function daysBetween(a: string, b: string): number {
  const msA = Date.parse(`${a}T00:00:00Z`);
  const msB = Date.parse(`${b}T00:00:00Z`);
  return Math.round((msB - msA) / MS_PER_DAY);
}

/**
 * Applies one lesson completion, on the learner's local `today`, to their
 * current streak state. One freeze covers exactly one missed day (a gap of
 * 2 calendar dates); anything larger breaks the streak even with freezes
 * banked, since a freeze was only ever meant to cover a single slip.
 */
export function applyLessonCompletion(state: StreakState, today: string): StreakUpdate {
  if (!state.lastActiveDate) {
    return {
      currentCount: 1,
      freezeBalance: state.freezeBalance,
      lastActiveDate: today,
      freezeConsumed: false,
      freezeEarned: false,
      streakBroken: false,
    };
  }

  const gap = daysBetween(state.lastActiveDate, today);

  if (gap <= 0) {
    // Already active today (or a clock/timezone oddity) — no change.
    return { ...state, freezeConsumed: false, freezeEarned: false, streakBroken: false };
  }

  if (gap === 1) {
    const currentCount = state.currentCount + 1;
    const freezeEarned = currentCount % FREEZE_EVERY_N_DAYS === 0;
    return {
      currentCount,
      freezeBalance: state.freezeBalance + (freezeEarned ? 1 : 0),
      lastActiveDate: today,
      freezeConsumed: false,
      freezeEarned,
      streakBroken: false,
    };
  }

  if (gap === 2 && state.freezeBalance > 0) {
    const currentCount = state.currentCount + 1;
    const freezeEarned = currentCount % FREEZE_EVERY_N_DAYS === 0;
    return {
      currentCount,
      freezeBalance: state.freezeBalance - 1 + (freezeEarned ? 1 : 0),
      lastActiveDate: today,
      freezeConsumed: true,
      freezeEarned,
      streakBroken: false,
    };
  }

  // Gap too large, or no freeze available to cover it — streak resets.
  return {
    currentCount: 1,
    freezeBalance: state.freezeBalance,
    lastActiveDate: today,
    freezeConsumed: false,
    freezeEarned: false,
    streakBroken: true,
  };
}
