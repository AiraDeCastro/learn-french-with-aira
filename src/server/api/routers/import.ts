import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { isAtLeast, type Level } from "@/server/level-estimate";
import { assertPubliclyFetchable } from "@/server/url-safety";

/** PRD §6: B2 is the first tier whose library content is "imported content... the learner brings in." */
const IMPORTABLE_LEVELS = ["B2", "C1", "C2"] as const;

const FETCH_TIMEOUT_MS = 10_000;
/** A hard cap on how much of a fetched page is held in memory, since an arbitrary URL could point at something huge. */
const MAX_HTML_BYTES = 5_000_000;
const MIN_ARTICLE_CHARS = 200;
/**
 * A hard cap on how much of the extracted article becomes the lesson.
 * Without this, a genuinely long page (a Wikipedia article ran to over
 * 22,000 tap-to-translate word-spans in testing) turns into an unusably
 * huge DOM — nothing like the "one short session" unit every other lesson
 * in the library is. Kept generous enough for a real long-form article,
 * not squeezed down to mini-story length.
 */
const MAX_ARTICLE_CHARS = 8_000;

export const importRouter = createTRPCRouter({
  /**
   * "Paste in a link, get an interactive lesson" (PRD §7 V2). Scoped to
   * article URLs only for this first pass — turning a YouTube video or
   * podcast episode into readable French text needs a transcription
   * service, which is a real infrastructure decision to make when that
   * work actually starts (same reasoning PLANNING.md gives for deferring
   * M7's speech-to-text pick), not something to assume here.
   */
  fromUrl: publicProcedure
    .input(
      z.object({
        url: z.string().url(),
        level: z.enum(IMPORTABLE_LEVELS),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = ctx.userId;

      // Gated to "learners at B2+" (PRD §7) — native, unscaffolded content
      // isn't the i+1 the method calls for below that.
      const levelEstimate = await ctx.db.levelEstimate.findUnique({ where: { userId } });
      const learnerLevel: Level = (levelEstimate?.level as Level | undefined) ?? "A1";
      if (!isAtLeast(learnerLevel, "B2")) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Importing your own content unlocks once you reach B2.",
        });
      }

      const url = await assertPubliclyFetchable(input.url).catch((err: Error) => {
        throw new TRPCError({ code: "BAD_REQUEST", message: err.message });
      });

      let html: string;
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; AiraLearnFrench/1.0)" },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        html = await response.text();
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Couldn't fetch that page — check the link and try again.",
        });
      }
      if (html.length > MAX_HTML_BYTES) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That page is too large to import.",
        });
      }

      // Lazily imported, not top-level: tRPC bundles every router into one
      // module, so a static import here would pull jsdom's module graph
      // into the evaluation path of every tRPC call, not just this one —
      // exactly what broke every route in production (Vercel's runtime hit
      // an ERR_REQUIRE_ESM crash in one of jsdom's transitive deps at
      // *module load*, not at call time, so it took the whole API down).
      // Same reasoning as current-user.ts's lazy `@/auth` import.
      const { JSDOM } = await import("jsdom");
      const { Readability } = await import("@mozilla/readability");
      const dom = new JSDOM(html, { url: url.toString() });
      const article = new Readability(dom.window.document).parse();
      const text = article?.textContent?.trim() ?? "";
      if (text.length < MIN_ARTICLE_CHARS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Couldn't find a readable article on that page.",
        });
      }

      const allParagraphs = text
        .split(/\n{2,}/)
        .map((p) => p.replace(/[ \t]+/g, " ").trim())
        .filter((p) => p.length > 0);

      // Keep whole paragraphs up to the cap rather than cutting mid-sentence
      // — except the very first one, which gets truncated itself if it
      // alone is over the cap (some pages extract as one giant paragraph
      // with no blank-line breaks at all), so an import never comes back
      // completely empty.
      const paragraphs: string[] = [];
      let charCount = 0;
      for (const paragraph of allParagraphs) {
        const remaining = MAX_ARTICLE_CHARS - charCount;
        if (remaining <= 0) break;
        if (paragraph.length > remaining) {
          if (paragraphs.length === 0) paragraphs.push(paragraph.slice(0, remaining));
          break;
        }
        paragraphs.push(paragraph);
        charCount += paragraph.length;
      }

      const bodyText = paragraphs.join("\n\n");

      return ctx.db.lesson.create({
        data: {
          title: article?.title?.trim() || "Imported article",
          level: input.level,
          type: "IMPORTED",
          sourceType: "IMPORTED",
          sourceUrl: url.toString(),
          ownerId: userId,
          bodyText,
          segments: {
            create: paragraphs.map((segmentText, order) => ({
              order,
              text: segmentText,
            })),
          },
        },
      });
    }),
});
