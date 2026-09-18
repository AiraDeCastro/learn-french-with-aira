import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { applyLessonCompletion, localDateString, milestoneHitOn } from "@/server/streak";
import { estimateLevel, maxLevel, type Level } from "@/server/level-estimate";
import { track } from "@/server/analytics";
import { sharedOrOwnedByUser } from "@/server/api/routers/lesson";

/**
 * An imported lesson (PRD §7 V2 "bring your own content") has no
 * comprehension questions — nothing auto-generates them from arbitrary
 * fetched text — so it can't be gated the normal way. Instead it requires
 * looking up this many distinct new words from the lesson first: real
 * reading engagement, not a trivial tap-through (PRD §8's "streaks ≠ input"
 * guardrail). Enforced server-side below; Reader.tsx mirrors the same
 * number client-side only to disable the button early — the client copy is
 * UX, not the security boundary (it can't import this file: that would
 * pull server-only/Prisma code into the browser bundle).
 */
export const MIN_LOOKUPS_FOR_IMPORTED_COMPLETION = 3;

/**
 * Progress is server-authoritative (PLANNING.md §2.2): the client never
 * decides a word is "known" or a lesson is "complete" on its own — it asks
 * these procedures, which write to the database under the acting user's id
 * (resolved once per request in createTRPCContext, not here — see trpc.ts).
 */
export const progressRouter = createTRPCRouter({
  saveWord: publicProcedure
    .input(z.object({ word: z.string().min(1), lessonId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const word = input.word.trim().toLowerCase();
      return ctx.db.knownWord.upsert({
        where: { userId_word: { userId: ctx.userId, word } },
        update: { lastSeenAt: new Date() },
        create: { userId: ctx.userId, word, sourceLessonId: input.lessonId },
      });
    }),

  completeLesson: publicProcedure
    .input(
      z.object({
        lessonId: z.string(),
        answers: z.array(z.number().int().min(0)),
        durationSeconds: z.number().int().min(0).default(0),
        /** IANA name, e.g. "Europe/Paris" — captured opportunistically (see User.timezone). */
        timezone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      const userId = ctx.userId;

      const [lesson, questions] = await Promise.all([
        ctx.db.lesson.findUniqueOrThrow({
          where: { id: input.lessonId },
          select: { sourceType: true },
        }),
        ctx.db.comprehensionQuestion.findMany({
          where: { lessonId: input.lessonId },
          orderBy: { order: "asc" },
        }),
      ]);

      const correctCount = questions.reduce(
        (count, question, i) =>
          count + (input.answers[i] === question.correctIndex ? 1 : 0),
        0,
      );

      // No comprehension check exists to gate an imported lesson on — see
      // MIN_LOOKUPS_FOR_IMPORTED_COMPLETION's doc comment above.
      if (questions.length === 0 && lesson.sourceType === "IMPORTED") {
        const lookupCount = await ctx.db.knownWord.count({
          where: { userId, sourceLessonId: input.lessonId },
        });
        if (lookupCount < MIN_LOOKUPS_FOR_IMPORTED_COMPLETION) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Look up at least ${MIN_LOOKUPS_FOR_IMPORTED_COMPLETION} words in this lesson before finishing it.`,
          });
        }
      }

      const user = input.timezone
        ? await ctx.db.user.update({
            where: { id: userId },
            data: { timezone: input.timezone },
          })
        : await ctx.db.user.findUniqueOrThrow({ where: { id: userId } });
      const timezone = user.timezone ?? "UTC";
      const today = localDateString(new Date(), timezone);

      await ctx.db.lessonCompletion.create({
        data: {
          userId,
          lessonId: input.lessonId,
          durationSeconds: input.durationSeconds,
        },
      });

      const existingStreak = await ctx.db.streak.findUnique({ where: { userId } });
      const streakUpdate = applyLessonCompletion(
        {
          currentCount: existingStreak?.currentCount ?? 0,
          freezeBalance: existingStreak?.freezeBalance ?? 0,
          lastActiveDate: existingStreak?.lastActiveDate ?? null,
        },
        today,
      );
      const streak = await ctx.db.streak.upsert({
        where: { userId },
        update: {
          currentCount: streakUpdate.currentCount,
          freezeBalance: streakUpdate.freezeBalance,
          lastActiveDate: streakUpdate.lastActiveDate,
        },
        create: {
          userId,
          currentCount: streakUpdate.currentCount,
          freezeBalance: streakUpdate.freezeBalance,
          lastActiveDate: streakUpdate.lastActiveDate,
        },
      });

      const [knownWordCount, completions, existingLevelEstimate] = await Promise.all([
        ctx.db.knownWord.count({ where: { userId } }),
        ctx.db.lessonCompletion.findMany({
          where: { userId },
          include: { lesson: { select: { level: true } } },
        }),
        ctx.db.levelEstimate.findUnique({ where: { userId } }),
      ]);
      const completedLessonCountByLevel: Partial<Record<Level, number>> = {};
      for (const completion of completions) {
        const level = completion.lesson.level as Level;
        completedLessonCountByLevel[level] =
          (completedLessonCountByLevel[level] ?? 0) + 1;
      }
      const freshEstimate = estimateLevel({
        knownWordCount,
        completedLessonCountByLevel,
      });
      // Never let an ordinary lesson completion silently lower an existing
      // estimate — see level-estimate.ts's doc comment on estimateLevel.
      const level = existingLevelEstimate
        ? maxLevel(freshEstimate.level, existingLevelEstimate.level as Level)
        : freshEstimate.level;
      const basis =
        level === freshEstimate.level
          ? freshEstimate.basis
          : existingLevelEstimate!.basis;
      const levelEstimate = await ctx.db.levelEstimate.upsert({
        where: { userId },
        update: { level, basis },
        create: { userId, level, basis },
      });

      // Paired with `lesson_started` (lesson.getForReader) for the PRD §10
      // completion-rate metric; `durationSeconds` and `streakCurrentCount`
      // here are what the weekly-input-hours and streak-length metrics get
      // computed from.
      await track(ctx.db, {
        userId,
        event: "lesson_completed",
        properties: {
          lessonId: input.lessonId,
          correctCount,
          total: questions.length,
          durationSeconds: input.durationSeconds,
          streakCurrentCount: streak.currentCount,
          streakBroken: streakUpdate.streakBroken,
          level,
        },
      });

      return {
        correctCount,
        total: questions.length,
        streak: {
          currentCount: streak.currentCount,
          freezeBalance: streak.freezeBalance,
          freezeEarned: streakUpdate.freezeEarned,
          freezeConsumed: streakUpdate.freezeConsumed,
          streakBroken: streakUpdate.streakBroken,
          milestoneDays: milestoneHitOn(streak.currentCount),
        },
        levelEstimate,
      };
    }),

  getDashboard: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const userId = ctx.userId;

    const streak = await ctx.db.streak.findUnique({ where: { userId } });
    const levelEstimate = await ctx.db.levelEstimate.findUnique({ where: { userId } });
    const knownWordCount = await ctx.db.knownWord.count({ where: { userId } });
    const completions = await ctx.db.lessonCompletion.findMany({
      where: { userId },
      select: { durationSeconds: true },
    });

    const totalSeconds = completions.reduce((sum, c) => sum + c.durationSeconds, 0);

    return {
      streak: streak ?? { currentCount: 0, freezeBalance: 0, lastActiveDate: null },
      levelEstimate,
      knownWordCount,
      hoursOfInput: totalSeconds / 3600,
    };
  }),

  /**
   * Picks "one recommended lesson at the learner's level and interests, no
   * browsing required" (PRD §7 home-screen requirement). Falls back in
   * stages, ranking interest ahead of level per PRD §7 Phase 2
   * ("recommendations filter by interest before level"): interest+level
   * match, then interest match at any level, then level-only, then anything
   * uncompleted, then anything at all — since a new library can't always
   * satisfy the ideal match.
   */
  recommendNextLesson: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const userId = ctx.userId;

    const [user, levelEstimate, completions] = await Promise.all([
      ctx.db.user.findUniqueOrThrow({ where: { id: userId } }),
      ctx.db.levelEstimate.findUnique({ where: { userId } }),
      ctx.db.lessonCompletion.findMany({ where: { userId }, select: { lessonId: true } }),
    ]);
    const level = levelEstimate?.level ?? "A1";
    const completedIds = completions.map((c) => c.lessonId);
    // Never recommend another learner's imported lesson (PRD §11) or
    // something already completed.
    const notCompleted = {
      id: { notIn: completedIds },
      ...sharedOrOwnedByUser(userId),
    };

    // id tiebreaker throughout: rows seeded/imported in the same batch can
    // share a createdAt down to the millisecond, which otherwise makes
    // "the next lesson" inconsistent across identical calls.
    function stableOrder() {
      return [{ createdAt: "asc" as const }, { id: "asc" as const }];
    }

    const byLevelAndInterest =
      user.interests.length > 0
        ? await ctx.db.lesson.findFirst({
            where: { level, topicTags: { hasSome: user.interests }, ...notCompleted },
            orderBy: stableOrder(),
          })
        : null;
    if (byLevelAndInterest) return byLevelAndInterest;

    // Interest wins over level: a lesson matching what the learner said
    // they care about, even at a level that isn't theirs yet, beats an
    // on-level lesson about nothing they picked.
    const byInterestAnyLevel =
      user.interests.length > 0
        ? await ctx.db.lesson.findFirst({
            where: { topicTags: { hasSome: user.interests }, ...notCompleted },
            orderBy: stableOrder(),
          })
        : null;
    if (byInterestAnyLevel) return byInterestAnyLevel;

    const byLevel = await ctx.db.lesson.findFirst({
      where: { level, ...notCompleted },
      orderBy: stableOrder(),
    });
    if (byLevel) return byLevel;

    const anyNotCompleted = await ctx.db.lesson.findFirst({
      where: notCompleted,
      orderBy: stableOrder(),
    });
    if (anyNotCompleted) return anyNotCompleted;

    return ctx.db.lesson.findFirst({
      where: sharedOrOwnedByUser(userId),
      orderBy: stableOrder(),
    });
  }),
});
