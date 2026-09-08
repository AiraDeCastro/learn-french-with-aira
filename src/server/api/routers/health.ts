import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

/**
 * Proves the tRPC wiring works end to end (client -> Next.js route handler
 * -> router -> back to client) without touching a database. See
 * src/server/api/root.test.ts for the automated check.
 */
export const healthRouter = createTRPCRouter({
  ping: publicProcedure.input(z.void()).query(() => {
    return { status: "ok" as const, timestamp: new Date().toISOString() };
  }),
});
