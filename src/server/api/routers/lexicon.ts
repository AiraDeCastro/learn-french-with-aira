import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

/**
 * Self-hosted French word lookup backing tap-to-translate (PLANNING.md §3):
 * a database lookup, not a third-party dictionary API, so it stays instant
 * and works offline once cached. Seeded from a hand-curated starter set for
 * now (prisma/seed.ts) — bulk-importing an open dataset (FreeDict/Wiktionary)
 * is a follow-up (docs/TASKS.md M1).
 */
export const lexiconRouter = createTRPCRouter({
  lookup: publicProcedure
    .input(z.object({ word: z.string().min(1) }))
    .query(({ ctx, input }) => {
      const headword = input.word.trim().toLowerCase();
      return ctx.db.lexiconEntry.findFirst({ where: { headword, language: "fr" } });
    }),
});
