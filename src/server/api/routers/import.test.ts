import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn().mockResolvedValue([{ address: "93.184.216.34", family: 4 }]),
}));

const PARAGRAPH =
  "Ceci est un paragraphe de test en français, écrit avec suffisamment de mots pour dépasser le seuil minimal de caractères requis par l'extracteur de lecture.";

const SAMPLE_ARTICLE_HTML = `<!doctype html>
<html lang="fr">
<head><title>Un article de test</title></head>
<body>
<main>
<article>
<h1>Un article de test</h1>
<p>${PARAGRAPH}</p>
<p>${PARAGRAPH} Encore un peu de texte pour que l'article ait plusieurs paragraphes distincts.</p>
<p>${PARAGRAPH} Un troisième paragraphe garantit que l'extraction ne dépend pas d'un seul bloc de texte.</p>
</article>
</main>
</body>
</html>`;

/**
 * Integration test against the real local database (see CLAUDE.md's
 * commit-workflow notes) — only `fetch` and DNS are mocked, since those are
 * the two genuinely external dependencies (the network and the page being
 * imported), not the database.
 */
describe("importRouter.fromUrl", () => {
  const TEST_EMAIL = "import-test@aira.test";
  let userId: string;
  const createdLessonIds: string[] = [];
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: { email: TEST_EMAIL },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.lesson.deleteMany({ where: { id: { in: createdLessonIds } } });
    await db.levelEstimate.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
    await db.$disconnect();
  });

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it("rejects a learner below B2 without ever fetching the page", async () => {
    const caller = appRouter.createCaller({ db, userId });
    await expect(
      caller.import.fromUrl({ url: "https://example.test/article", level: "B2" }),
    ).rejects.toThrow(/B2/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("refuses to fetch a private/internal address — SSRF guard", async () => {
    await db.levelEstimate.upsert({
      where: { userId },
      update: { level: "C1", basis: "test setup" },
      create: { userId, level: "C1", basis: "test setup" },
    });

    const caller = appRouter.createCaller({ db, userId });
    // The canonical real-world SSRF target: a cloud metadata endpoint.
    await expect(
      caller.import.fromUrl({
        url: "http://169.254.169.254/latest/meta-data",
        level: "C1",
      }),
    ).rejects.toThrow(/private address/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a page with too little readable text", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("<html><body><p>Too short.</p></body></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const caller = appRouter.createCaller({ db, userId });
    await expect(
      caller.import.fromUrl({ url: "https://example.test/empty", level: "B2" }),
    ).rejects.toThrow(/readable article/);
  });

  it("imports an article into a personal, owner-scoped lesson once the learner is B2+", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(SAMPLE_ARTICLE_HTML, {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    );

    const caller = appRouter.createCaller({ db, userId });
    const lesson = await caller.import.fromUrl({
      url: "https://example.test/article",
      level: "B2",
    });
    createdLessonIds.push(lesson.id);

    expect(lesson.sourceType).toBe("IMPORTED");
    expect(lesson.ownerId).toBe(userId);
    expect(lesson.sourceUrl).toBe("https://example.test/article");
    expect(lesson.level).toBe("B2");
    expect(lesson.bodyText.length).toBeGreaterThan(100);

    const segments = await db.transcriptSegment.findMany({
      where: { lessonId: lesson.id },
    });
    expect(segments.length).toBeGreaterThan(0);
  });

  it("truncates a very long article instead of importing the whole thing — regression test for a real Wikipedia import producing 22,000+ word-spans", async () => {
    const longParagraphs = Array.from(
      { length: 100 },
      (_, i) => `<p>${PARAGRAPH} Paragraphe numéro ${i}.</p>`,
    ).join("\n");
    const longHtml = `<!doctype html>
<html lang="fr">
<head><title>Un très long article</title></head>
<body><main><article><h1>Un très long article</h1>${longParagraphs}</article></main></body>
</html>`;

    fetchSpy.mockResolvedValueOnce(
      new Response(longHtml, { status: 200, headers: { "content-type": "text/html" } }),
    );

    const caller = appRouter.createCaller({ db, userId });
    const lesson = await caller.import.fromUrl({
      url: "https://example.test/long-article",
      level: "B2",
    });
    createdLessonIds.push(lesson.id);

    // A little headroom over the 8,000-char cap for the paragraph that
    // pushed it over the line, but nowhere near the ~16,000 chars of raw
    // input.
    expect(lesson.bodyText.length).toBeLessThan(9_000);

    const segments = await db.transcriptSegment.findMany({
      where: { lessonId: lesson.id },
    });
    expect(segments.length).toBeLessThan(100);
  });
});

describe("imported lessons stay scoped to their owner — PRD §11", () => {
  const OWNER_EMAIL = "import-owner-test@aira.test";
  const OTHER_EMAIL = "import-other-test@aira.test";
  let ownerId: string;
  let otherUserId: string;
  let importedLessonId: string;

  beforeAll(async () => {
    const owner = await db.user.upsert({
      where: { email: OWNER_EMAIL },
      update: {},
      create: { email: OWNER_EMAIL },
    });
    ownerId = owner.id;
    const other = await db.user.upsert({
      where: { email: OTHER_EMAIL },
      update: {},
      create: { email: OTHER_EMAIL },
    });
    otherUserId = other.id;

    const lesson = await db.lesson.create({
      data: {
        title: "Owner-only imported lesson",
        level: "B2",
        type: "IMPORTED",
        sourceType: "IMPORTED",
        sourceUrl: "https://example.test/owner-only",
        ownerId,
        bodyText: "Texte importé réservé au propriétaire.",
      },
    });
    importedLessonId = lesson.id;
  });

  afterAll(async () => {
    await db.lesson.delete({ where: { id: importedLessonId } });
    await db.user.delete({ where: { id: ownerId } });
    await db.user.delete({ where: { id: otherUserId } });
  });

  it("does not appear in another learner's library listing", async () => {
    const otherCaller = appRouter.createCaller({ db, userId: otherUserId });
    const lessons = await otherCaller.lesson.list();
    expect(lessons.some((l) => l.id === importedLessonId)).toBe(false);
  });

  it("appears in the owner's own library listing", async () => {
    const ownerCaller = appRouter.createCaller({ db, userId: ownerId });
    const lessons = await ownerCaller.lesson.list();
    expect(lessons.some((l) => l.id === importedLessonId)).toBe(true);
  });

  it("404s for another learner opening it directly, even by a guessed/known id", async () => {
    const otherCaller = appRouter.createCaller({ db, userId: otherUserId });
    await expect(
      otherCaller.lesson.getForReader({ id: importedLessonId }),
    ).rejects.toThrow(/not found/i);
  });

  it("opens normally for the owner", async () => {
    const ownerCaller = appRouter.createCaller({ db, userId: ownerId });
    const lesson = await ownerCaller.lesson.getForReader({ id: importedLessonId });
    expect(lesson.id).toBe(importedLessonId);
  });
});
