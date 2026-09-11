import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { db } from "@/server/db";
import { getCurrentUserId } from "@/server/current-user";

/**
 * Per-request context, resolved once per request. `userId` is resolved
 * here — not by individual procedures calling `getCurrentUserId()`
 * themselves — specifically so router files never import `@/auth`
 * (next-auth) directly: next-auth requires the real Next.js runtime and
 * breaks module resolution under Vitest. Tests construct their own context
 * object (`{ db, userId }`) and never touch this function.
 */
export async function createTRPCContext() {
  const userId = await getCurrentUserId();
  return { db, userId };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
