/**
 * First-pass, directional-only heuristic (PRD §12 — never presented to the
 * learner as a certified CEFR score). Combines known-word volume with which
 * levels the learner has completed multiple lessons at ("comfortably",
 * per docs/TASKS.md M3). Thresholds are a starting point, not a calibrated
 * model — revisit once there's real usage data to tune against.
 */

export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

const LEVEL_ORDER: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

/** Higher of the two levels. Used to keep an estimate from silently regressing — see `estimateLevel`'s doc comment. */
export function maxLevel(a: Level, b: Level): Level {
  return LEVEL_ORDER.indexOf(a) >= LEVEL_ORDER.indexOf(b) ? a : b;
}

const WORD_COUNT_THRESHOLDS: [Level, number][] = [
  ["C2", 1500],
  ["C1", 700],
  ["B2", 350],
  ["B1", 150],
  ["A2", 50],
  ["A1", 0],
];

export function levelFromKnownWordCount(count: number): Level {
  for (const [level, threshold] of WORD_COUNT_THRESHOLDS) {
    if (count >= threshold) return level;
  }
  return "A1";
}

/** A learner has "completed multiple lessons" at a level once they've finished at least this many. */
const COMFORTABLE_COMPLETION_COUNT = 2;

/**
 * Computes a fresh estimate from current signals only. This can come out
 * lower than a learner's existing estimate — e.g. right after a placement
 * quiz set them at A2, but they've only completed one A1 lesson so far, so
 * word count and completions alone would say A1. The caller (progress.ts's
 * completeLesson) combines this with the existing estimate via `maxLevel`
 * so ordinary lesson completions never silently regress a level. A fresh
 * placement-quiz attempt is the one thing allowed to lower it, since that's
 * a learner deliberately re-asserting where they are.
 */
export function estimateLevel(input: {
  knownWordCount: number;
  completedLessonCountByLevel: Partial<Record<Level, number>>;
}): { level: Level; basis: string } {
  const wordLevel = levelFromKnownWordCount(input.knownWordCount);

  let comfortableLevel: Level = "A1";
  for (const level of LEVEL_ORDER) {
    if ((input.completedLessonCountByLevel[level] ?? 0) >= COMFORTABLE_COMPLETION_COUNT) {
      comfortableLevel = level;
    }
  }

  const level =
    LEVEL_ORDER.indexOf(comfortableLevel) > LEVEL_ORDER.indexOf(wordLevel)
      ? comfortableLevel
      : wordLevel;

  return {
    level,
    basis: `${input.knownWordCount} known word${input.knownWordCount === 1 ? "" : "s"}; comfortable through ${comfortableLevel}`,
  };
}
