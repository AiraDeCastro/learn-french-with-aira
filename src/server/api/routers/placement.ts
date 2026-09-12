import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

/**
 * Deliberately scoped to only distinguish A1 from A2: the library only has
 * A1 content seeded so far (docs/TASKS.md M1), so a placement quiz that
 * claimed to sort learners into B1/B2/C1 would be assessing against
 * content that doesn't exist yet — dishonest, not just optimistic. Extend
 * this once higher-level content exists (see docs/TASKS.md M3 follow-up).
 */
const PLACEMENT_QUESTIONS = [
  {
    id: "q1",
    prompt: "Que veut dire « chat » ?",
    choices: ["Cat", "Dog", "House"],
    correctIndex: 0,
  },
  {
    id: "q2",
    prompt: "« Le chat est sur la table. » Où est le chat ?",
    choices: ["On the table", "Under the table", "In the house"],
    correctIndex: 0,
  },
  {
    id: "q3",
    prompt:
      "« Marie aime son chat, mais elle n'aime pas les chiens. » Qu'est-ce que Marie n'aime pas ?",
    choices: ["Cats", "Dogs", "Her family"],
    correctIndex: 1,
  },
] as const;

export const placementRouter = createTRPCRouter({
  getQuestions: publicProcedure.query(() =>
    PLACEMENT_QUESTIONS.map(({ id, prompt, choices }) => ({ id, prompt, choices })),
  ),

  submit: publicProcedure
    .input(
      z.union([
        z.object({ startingFromZero: z.literal(true) }),
        z.object({
          answers: z.array(z.number().int().min(0)).length(PLACEMENT_QUESTIONS.length),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      let level: "A1" | "A2" = "A1";
      let basis: string;

      if ("startingFromZero" in input) {
        basis = "placement quiz: starting from zero";
      } else {
        const correctCount = PLACEMENT_QUESTIONS.reduce(
          (count, q, i) => count + (input.answers[i] === q.correctIndex ? 1 : 0),
          0,
        );
        level = correctCount === PLACEMENT_QUESTIONS.length ? "A2" : "A1";
        basis = `placement quiz: ${correctCount}/${PLACEMENT_QUESTIONS.length} correct`;
      }

      return ctx.db.levelEstimate.upsert({
        where: { userId: ctx.userId },
        update: { level, basis },
        create: { userId: ctx.userId, level, basis },
      });
    }),
});
