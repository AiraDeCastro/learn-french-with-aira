import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

const TINY_WEBM_BASE64 = Buffer.from(
  "not real audio, just needs to be non-empty",
).toString("base64");

describe("speakingRouter", () => {
  const TEST_EMAIL = "speaking-test@aira.test";
  let userId: string;
  let lessonId: string;

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: { email: TEST_EMAIL },
    });
    userId = user.id;

    const lesson = await db.lesson.create({
      data: {
        title: "Speaking test lesson",
        level: "B1",
        type: "MINI_STORY",
        bodyText: "Bonjour.",
      },
    });
    lessonId = lesson.id;
  });

  afterAll(async () => {
    await db.spokenResponse.deleteMany({ where: { userId } });
    await db.lesson.delete({ where: { id: lessonId } });
    await db.user.delete({ where: { id: userId } });
  });

  it("rejects a learner below B1", async () => {
    const caller = appRouter.createCaller({ db, userId });
    await expect(
      caller.speaking.submit({
        lessonId,
        audioBase64: TINY_WEBM_BASE64,
        mimeType: "audio/webm",
      }),
    ).rejects.toThrow(/B1/);
  });

  it("rejects an empty recording", async () => {
    await db.levelEstimate.upsert({
      where: { userId },
      update: { level: "B1", basis: "test setup" },
      create: { userId, level: "B1", basis: "test setup" },
    });

    const caller = appRouter.createCaller({ db, userId });
    await expect(
      caller.speaking.submit({ lessonId, audioBase64: "", mimeType: "audio/webm" }),
    ).rejects.toThrow();
  });

  it("saves a recording once the learner is B1+, and lists it back for that lesson", async () => {
    const caller = appRouter.createCaller({ db, userId });

    const saved = await caller.speaking.submit({
      lessonId,
      audioBase64: TINY_WEBM_BASE64,
      mimeType: "audio/webm",
    });

    expect(saved.userId).toBe(userId);
    expect(saved.lessonId).toBe(lessonId);
    expect(saved.audioUrl).toMatch(/^\/api\/media\/recording\/.+\.webm$/);

    const listed = await caller.speaking.listForLesson({ lessonId });
    expect(listed.some((r) => r.id === saved.id)).toBe(true);
  });

  it("refuses a recording over the size cap", async () => {
    const caller = appRouter.createCaller({ db, userId });
    const hugeBase64 = Buffer.alloc(6_000_000).toString("base64");

    await expect(
      caller.speaking.submit({
        lessonId,
        audioBase64: hugeBase64,
        mimeType: "audio/webm",
      }),
    ).rejects.toThrow(/too long/);
  });
});
