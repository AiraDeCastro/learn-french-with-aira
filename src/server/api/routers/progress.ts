import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import { applyLessonCompletion, localDateString } from "@/server/streak";
import { estimateLevel, maxLevel, type Level } from "@/server/level-estimate";

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

      const questions = await ctx.db.comprehensionQuestion.findMany({
        where: { lessonId: input.lessonId },
        orderBy: { order: "asc" },
      });

      const correctCount = questions.reduce(
        (count, question, i) =>
          count + (input.answers[i] === question.correctIndex ? 1 : 0),
        0,
      );

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

      return {
        correctCount,
        total: questions.length,
        streak: {
          currentCount: streak.currentCount,
          freezeBalance: streak.freezeBalance,
          freezeEarned: streakUpdate.freezeEarned,
          freezeConsumed: streakUpdate.freezeConsumed,
          streakBroken: streakUpdate.streakBroken,
          hitSevenDayMilestone: streak.currentCount === 7,
        },
        levelEstimate,
      };
    }),

  getDashboard: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const userId = ctx.userId;

    const [streak, levelEstimate, knownWordCount, completions] = await Promise.all([
      ctx.db.streak.findUnique({ where: { userId } }),
      ctx.db.levelEstimate.findUnique({ where: { userId } }),
      ctx.db.knownWord.count({ where: { userId } }),
      ctx.db.lessonCompletion.findMany({
        where: { userId },
        select: { durationSeconds: true },
      }),
    ]);

    const totalSeconds = completions.reduce((sum, c) => sum + c.durationSeconds, 0);

    return {
      streak: streak ?? { currentCount: 0, freezeBalance: 0, lastActiveDate: null },
      levelEstimate,
      knownWordCount,
      hoursOfInput: totalSeconds / 3600,
    };
  }),
});
