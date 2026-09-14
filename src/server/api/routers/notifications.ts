import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";

/**
 * Web Push subscription capture (PRD §7: "Web Push primary, email
 * fallback"). Actually *sending* on a schedule needs a deployed cron
 * trigger, which doesn't exist yet (no Vercel project — TASKS.md M0); see
 * scripts/send-reminders.mjs for the manually-invoked sender this feeds.
 */
export const notificationsRouter = createTRPCRouter({
  getVapidPublicKey: publicProcedure.query(() => process.env.VAPID_PUBLIC_KEY ?? null),

  subscribe: publicProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string(), auth: z.string() }),
      }),
    )
    .mutation(({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.db.pushSubscription.upsert({
        where: { endpoint: input.endpoint },
        update: { userId: ctx.userId, p256dh: input.keys.p256dh, auth: input.keys.auth },
        create: {
          userId: ctx.userId,
          endpoint: input.endpoint,
          p256dh: input.keys.p256dh,
          auth: input.keys.auth,
        },
      });
    }),

  unsubscribe: publicProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      // Scoped by userId, not just endpoint: without this, anyone who
      // learned another user's endpoint string could delete that user's
      // subscription — found during the M5 privacy/access-control audit.
      return ctx.db.pushSubscription.deleteMany({
        where: { endpoint: input.endpoint, userId: ctx.userId },
      });
    }),

  setReminderHour: publicProcedure
    .input(z.object({ hour: z.number().int().min(0).max(23).nullable() }))
    .mutation(({ ctx, input }) => {
      if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
      return ctx.db.user.update({
        where: { id: ctx.userId },
        data: { reminderHour: input.hour },
      });
    }),

  getReminderSettings: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.userId) throw new TRPCError({ code: "UNAUTHORIZED" });
    const [user, subscriptionCount] = await Promise.all([
      ctx.db.user.findUniqueOrThrow({ where: { id: ctx.userId } }),
      ctx.db.pushSubscription.count({ where: { userId: ctx.userId } }),
    ]);
    return { reminderHour: user.reminderHour, hasSubscription: subscriptionCount > 0 };
  }),
});
