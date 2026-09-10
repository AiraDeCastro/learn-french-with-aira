import { createTRPCRouter } from "@/server/api/trpc";
import { healthRouter } from "@/server/api/routers/health";
import { lessonRouter } from "@/server/api/routers/lesson";
import { lexiconRouter } from "@/server/api/routers/lexicon";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  lesson: lessonRouter,
  lexicon: lexiconRouter,
});

export type AppRouter = typeof appRouter;
