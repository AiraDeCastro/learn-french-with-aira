import type { PrismaClient } from "@/generated/prisma/client";

/**
 * Shared by the real scheduled sender (src/app/api/cron/reminders/route.ts,
 * called hourly by a GitHub Actions workflow — see docs/TASKS.md M4) and
 * the manual CLI sender (scripts/send-reminders.ts) that predates it and is
 * kept for local testing. `sendNotification` is injected rather than
 * imported directly from `web-push` so this can be unit-tested without a
 * real push send; each caller passes its own `webpush.sendNotification`.
 */
export type SendNotification = (
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: string,
) => Promise<unknown>;

export interface ReminderSendResult {
  sent: number;
  skipped: number;
  pruned: number;
}

/** `now` defaults to the real current time; overridable so tests don't depend on wall-clock time. */
export function currentHourFor(timezone: string, now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(now),
  );
}

function isWebPushError(err: unknown): err is { statusCode: number; message: string } {
  return typeof err === "object" && err !== null && "statusCode" in err;
}

export async function sendDueReminders(
  db: PrismaClient,
  sendNotification: SendNotification,
  opts: { all?: boolean; now?: Date } = {},
): Promise<ReminderSendResult> {
  const users = await db.user.findMany({
    where: { reminderHour: { not: null }, pushSubscriptions: { some: {} } },
    include: { pushSubscriptions: true },
  });

  let sent = 0;
  let skipped = 0;
  let pruned = 0;

  for (const user of users) {
    const due =
      opts.all || currentHourFor(user.timezone ?? "UTC", opts.now) === user.reminderHour;
    if (!due) {
      skipped++;
      continue;
    }

    const payload = JSON.stringify({
      title: "Time for some French",
      body: "One short lesson keeps the streak alive.",
      url: "/",
    });

    for (const sub of user.pushSubscriptions) {
      try {
        await sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // 404/410 means the browser unsubscribed or the subscription expired.
        if (isWebPushError(err) && (err.statusCode === 404 || err.statusCode === 410)) {
          await db.pushSubscription.delete({ where: { id: sub.id } });
          pruned++;
        } else {
          console.error(`Failed to send to ${user.email}:`, err);
        }
      }
    }
  }

  return { sent, skipped, pruned };
}
