import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";
import { localDateString } from "@/server/streak";

/**
 * Constructs its own context with a real test user's id rather than going
 * through createTRPCContext()/getCurrentUserId() — those import @/auth
 * (next-auth), which requires the real Next.js runtime and breaks module
 * resolution under Vitest. See src/server/api/trpc.ts for why userId is
 * resolved in the context rather than inside each procedure.
 */
describe("progressRouter", () => {
  const TEST_EMAIL = "progress-router-test@aira.test";
  let userId: string;
  const createdLessonIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: { email: TEST_EMAIL },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.lessonCompletion.deleteMany({
      where: { lessonId: { in: createdLessonIds } },
    });
    await db.knownWord.deleteMany({ where: { userId } });
    await db.lesson.deleteMany({ where: { id: { in: createdLessonIds } } });
    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  it("saveWord upserts a known word for the acting user", async () => {
    const caller = appRouter.createCaller({ db, userId });

    const result = await caller.progress.saveWord({ word: "Chat-Test-Word" });
    expect(result.word).toBe("chat-test-word");

    const again = await caller.progress.saveWord({ word: "chat-test-word" });
    expect(again.id).toBe(result.id);
    expect(again.lastSeenAt.getTime()).toBeGreaterThanOrEqual(
      result.lastSeenAt.getTime(),
    );
  });

  it("rejects saveWord with no acting user", async () => {
    const caller = appRouter.createCaller({ db, userId: null });
    await expect(caller.progress.saveWord({ word: "peu-importe" })).rejects.toThrow(
      /UNAUTHORIZED/,
    );
  });

  it("completeLesson scores answers and records a completion", async () => {
    const caller = appRouter.createCaller({ db, userId });

    const lesson = await caller.lesson.create({
      title: "Progress test lesson",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour.",
      segments: [{ order: 0, text: "Bonjour." }],
      questions: [
        { order: 0, prompt: "Q1", choices: ["a", "b"], correctIndex: 0 },
        { order: 1, prompt: "Q2", choices: ["a", "b"], correctIndex: 1 },
      ],
    });
    createdLessonIds.push(lesson.id);

    const result = await caller.progress.completeLesson({
      lessonId: lesson.id,
      answers: [0, 0],
    });

    expect(result.total).toBe(2);
    expect(result.correctCount).toBe(1);
    expect(result.streak.currentCount).toBe(1);
    expect(result.levelEstimate.level).toBe("A1");
  });

  it("continues the streak on a consecutive day and reflects it in the dashboard", async () => {
    const caller = appRouter.createCaller({ db, userId });

    const lesson = await caller.lesson.create({
      title: "Progress test lesson 2",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour.",
      segments: [{ order: 0, text: "Bonjour." }],
      questions: [],
    });
    createdLessonIds.push(lesson.id);

    // Simulate "yesterday" directly, since completeLesson uses the real
    // current time internally — see src/server/streak.test.ts for the
    // exhaustive date-math cases; this just checks the wiring.
    const today = localDateString(new Date(), "UTC");
    const yesterday = localDateString(new Date(Date.now() - 24 * 60 * 60 * 1000), "UTC");
    await db.streak.upsert({
      where: { userId },
      update: { currentCount: 5, freezeBalance: 0, lastActiveDate: yesterday },
      create: { userId, currentCount: 5, freezeBalance: 0, lastActiveDate: yesterday },
    });

    const result = await caller.progress.completeLesson({
      lessonId: lesson.id,
      answers: [],
      durationSeconds: 120,
    });

    expect(result.streak.currentCount).toBe(6);
    expect(result.streak.streakBroken).toBe(false);

    const dashboard = await caller.progress.getDashboard();
    expect(dashboard.streak.currentCount).toBe(6);
    expect(dashboard.streak.lastActiveDate).toBe(today);
    expect(dashboard.hoursOfInput).toBeGreaterThan(0);
    expect(dashboard.knownWordCount).toBeGreaterThan(0);
  });

  it("flags hitSevenDayMilestone on exactly the 7th consecutive day", async () => {
    const caller = appRouter.createCaller({ db, userId });

    const lesson = await caller.lesson.create({
      title: "Progress test lesson 3",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour.",
      segments: [{ order: 0, text: "Bonjour." }],
      questions: [],
    });
    createdLessonIds.push(lesson.id);

    const yesterday = localDateString(new Date(Date.now() - 24 * 60 * 60 * 1000), "UTC");
    await db.streak.upsert({
      where: { userId },
      update: { currentCount: 6, freezeBalance: 0, lastActiveDate: yesterday },
      create: { userId, currentCount: 6, freezeBalance: 0, lastActiveDate: yesterday },
    });

    const result = await caller.progress.completeLesson({
      lessonId: lesson.id,
      answers: [],
    });

    expect(result.streak.currentCount).toBe(7);
    expect(result.streak.hitSevenDayMilestone).toBe(true);
    expect(result.streak.freezeEarned).toBe(true);
  });
});

describe("placementRouter", () => {
  const TEST_EMAIL = "placement-router-test@aira.test";
  let userId: string;

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: { email: TEST_EMAIL },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.user.delete({ where: { id: userId } });
  });

  it("sets A1 when starting from zero", async () => {
    const caller = appRouter.createCaller({ db, userId });
    const result = await caller.placement.submit({ startingFromZero: true });
    expect(result.level).toBe("A1");
    expect(result.basis).toContain("starting from zero");
  });

  it("sets A2 when every placement question is answered correctly", async () => {
    const caller = appRouter.createCaller({ db, userId });
    const result = await caller.placement.submit({ answers: [0, 0, 1] });
    expect(result.level).toBe("A2");
  });

  it("keeps A1 when a placement question is missed", async () => {
    const caller = appRouter.createCaller({ db, userId });
    const result = await caller.placement.submit({ answers: [0, 0, 0] });
    expect(result.level).toBe("A1");
  });
});

describe("level estimate does not regress on an ordinary lesson completion", () => {
  const TEST_EMAIL = "level-regression-test@aira.test";
  let userId: string;
  const createdLessonIds: string[] = [];

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: { email: TEST_EMAIL },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.lessonCompletion.deleteMany({
      where: { lessonId: { in: createdLessonIds } },
    });
    await db.lesson.deleteMany({ where: { id: { in: createdLessonIds } } });
    await db.user.delete({ where: { id: userId } });
  });

  it("keeps the placement quiz's A2 result after completing a low-signal A1 lesson", async () => {
    const caller = appRouter.createCaller({ db, userId });

    const placementResult = await caller.placement.submit({ answers: [0, 0, 1] });
    expect(placementResult.level).toBe("A2");

    const lesson = await caller.lesson.create({
      title: "Regression test lesson",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour.",
      segments: [{ order: 0, text: "Bonjour." }],
      questions: [],
    });
    createdLessonIds.push(lesson.id);

    // Word count/completion count alone would say A1 here — the point of
    // this test is that the A2 placement result survives anyway.
    const completionResult = await caller.progress.completeLesson({
      lessonId: lesson.id,
      answers: [],
    });

    expect(completionResult.levelEstimate.level).toBe("A2");
  });
});
