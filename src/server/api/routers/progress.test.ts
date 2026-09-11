import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

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
  });
});
