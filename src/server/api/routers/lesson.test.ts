import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

/**
 * Integration test: exercises the real lesson router against the local
 * Prisma dev database (see `npm run db:dev`). Requires DATABASE_URL to be
 * set (see .env.example) — this is what CI's "Generate Prisma client" +
 * the local dev DB both provide.
 */
describe("lessonRouter", () => {
  const caller = appRouter.createCaller({ db, userId: null });
  const createdIds: string[] = [];

  afterAll(async () => {
    await db.lesson.deleteMany({ where: { id: { in: createdIds } } });
  });

  it("creates a lesson with segments and questions, then reads it back", async () => {
    const created = await caller.lesson.create({
      title: "Le chat noir",
      level: "A1",
      type: "MINI_STORY",
      sourceType: "IN_HOUSE",
      topicTags: ["animals", "daily-life"],
      bodyText: "Il y a un chat noir. Le chat est sur la table.",
      translation: "There is a black cat. The cat is on the table.",
      segments: [
        { order: 0, text: "Il y a un chat noir." },
        { order: 1, text: "Le chat est sur la table." },
      ],
      questions: [
        {
          order: 0,
          prompt: "De quelle couleur est le chat ?",
          choices: ["Noir", "Blanc", "Marron"],
          correctIndex: 0,
        },
      ],
    });
    createdIds.push(created.id);

    expect(created.title).toBe("Le chat noir");
    expect(created.audioUrl).toBeNull();

    const fetched = await caller.lesson.getById({ id: created.id });
    expect(fetched.segments).toHaveLength(2);
    expect(fetched.segments[0].text).toBe("Il y a un chat noir.");
    expect(fetched.questions).toHaveLength(1);
  });

  it("getForReader never includes correctIndex — regression test for the M5 answer-key leak", async () => {
    const created = await caller.lesson.create({
      title: "Reader-safety test lesson",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour.",
      segments: [{ order: 0, text: "Bonjour." }],
      questions: [{ order: 0, prompt: "Q1", choices: ["a", "b"], correctIndex: 1 }],
    });
    createdIds.push(created.id);

    const forReader = await caller.lesson.getForReader({ id: created.id });
    expect(forReader.questions[0]).not.toHaveProperty("correctIndex");
    // getById (the admin-only path) is the one place correctIndex should
    // still appear — confirms this isn't just a naming difference.
    const forAdmin = await caller.lesson.getById({ id: created.id });
    expect(forAdmin.questions[0].correctIndex).toBe(1);
  });

  it("update() replaces segments and questions wholesale", async () => {
    const created = await caller.lesson.create({
      title: "Draft lesson",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour.",
      segments: [{ order: 0, text: "Bonjour." }],
      questions: [],
    });
    createdIds.push(created.id);

    const updated = await caller.lesson.update({
      id: created.id,
      title: "Draft lesson",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour. Ça va ?",
      segments: [
        { order: 0, text: "Bonjour." },
        { order: 1, text: "Ça va ?" },
      ],
      questions: [],
    });

    expect(updated.bodyText).toBe("Bonjour. Ça va ?");

    const fetched = await caller.lesson.getById({ id: created.id });
    expect(fetched.segments).toHaveLength(2);
  });
});

describe("lesson.getForReader analytics", () => {
  const TEST_EMAIL = "lesson-analytics-test@aira.test";
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
    await db.analyticsEvent.deleteMany({ where: { userId } });
    await db.lesson.deleteMany({ where: { id: { in: createdLessonIds } } });
    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  it("records a lesson_started event — feeds the PRD §10 completion-rate metric", async () => {
    const caller = appRouter.createCaller({ db, userId });

    const lesson = await caller.lesson.create({
      title: "Analytics test lesson",
      level: "A1",
      type: "MINI_STORY",
      bodyText: "Bonjour.",
      segments: [{ order: 0, text: "Bonjour." }],
      questions: [],
    });
    createdLessonIds.push(lesson.id);

    await caller.lesson.getForReader({ id: lesson.id });

    const events = await db.analyticsEvent.findMany({
      where: { userId, event: "lesson_started" },
    });
    expect(events).toHaveLength(1);
    expect(events[0].properties).toMatchObject({ lessonId: lesson.id, level: "A1" });
  });
});
