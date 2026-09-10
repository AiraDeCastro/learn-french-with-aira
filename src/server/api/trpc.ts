import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { db } from "@/server/db";

/**
 * Per-request context. Auth (Auth.js session) gets added here once a real
 * session exists to read — every procedure below will pick it up without
 * changing its own signature.
 */
export function createTRPCContext() {
  return { db };
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
