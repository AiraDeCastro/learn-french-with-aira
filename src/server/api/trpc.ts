import { initTRPC } from "@trpc/server";
import superjson from "superjson";

/**
 * Per-request context. Empty for now — auth (Auth.js session) gets added
 * here once M0's Auth.js task lands, and every procedure below will have
 * access to it without changing its own signature.
 */
export function createTRPCContext() {
  return {};
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
