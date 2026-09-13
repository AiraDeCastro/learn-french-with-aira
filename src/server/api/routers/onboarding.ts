import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

/**
 * A user has "completed onboarding" once `goal` is set — interests can be
 * empty (a learner might not pick any), but a null goal means they've
 * never been through the flow at all (see the home page's branching).
 */
export const onboardingRouter = createTRPCRouter({
  getStatus: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const user = await ctx.db.user.findUniqueOrThrow({ where: { id: ctx.userId } });
    return { completed: user.goal !== null, goal: user.goal, interests: user.interests };
  }),

  complete: publicProcedure
    .input(
      z.object({
        goal: z.string().min(1),
        interests: z.array(z.string()).max(3),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.db.user.update({
        where: { id: ctx.userId },
        data: { goal: input.goal, interests: input.interests },
      });
    }),
});
