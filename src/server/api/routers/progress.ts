import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

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
    .input(z.object({ lessonId: z.string(), answers: z.array(z.number().int().min(0)) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      const questions = await ctx.db.comprehensionQuestion.findMany({
        where: { lessonId: input.lessonId },
        orderBy: { order: "asc" },
      });

      const correctCount = questions.reduce(
        (count, question, i) =>
          count + (input.answers[i] === question.correctIndex ? 1 : 0),
        0,
      );

      await ctx.db.lessonCompletion.create({
        data: { userId: ctx.userId, lessonId: input.lessonId },
      });

      return { correctCount, total: questions.length };
    }),
});
