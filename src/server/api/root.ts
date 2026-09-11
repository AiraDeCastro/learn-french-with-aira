import { createTRPCRouter } from "@/server/api/trpc";
import { healthRouter } from "@/server/api/routers/health";
import { lessonRouter } from "@/server/api/routers/lesson";
import { lexiconRouter } from "@/server/api/routers/lexicon";
import { progressRouter } from "@/server/api/routers/progress";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  lesson: lessonRouter,
  lexicon: lexiconRouter,
  progress: progressRouter,
});

export type AppRouter = typeof appRouter;
