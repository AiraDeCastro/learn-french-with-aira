import { afterAll, describe, expect, it } from "vitest";
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
    await db.$disconnect();
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
