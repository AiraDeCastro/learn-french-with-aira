/**
 * Sends the daily reminder push notification (PRD §7) to whoever is due
 * right now — i.e. their `reminderHour` (in their own timezone) matches
 * the current hour.
 *
 * This is a manual stand-in for a real scheduler: actually running this on
 * a timer needs a deployed cron trigger (Vercel isn't provisioned yet —
 * see docs/TASKS.md M0). Until then, run it by hand to prove the mechanism
 * works: `npm run reminders:send`. Pass `--all` to ignore the hour check
 * and send to every subscribed user, for testing.
 */
import "dotenv/config";
import webpush from "web-push";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sendToAll = process.argv.includes("--all");

function currentHourFor(timezone: string): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
  );
}

function isWebPushError(err: unknown): err is { statusCode: number; message: string } {
  return typeof err === "object" && err !== null && "statusCode" in err;
}

async function main() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set — see .env.example.");
    process.exit(1);
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:dev-local@aira.test",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const users = await prisma.user.findMany({
    where: { reminderHour: { not: null }, pushSubscriptions: { some: {} } },
    include: { pushSubscriptions: true },
  });

  let sent = 0;
  let skipped = 0;
  let pruned = 0;

  for (const user of users) {
    const due = sendToAll || currentHourFor(user.timezone ?? "UTC") === user.reminderHour;
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
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        sent++;
      } catch (err) {
        // 404/410 means the browser unsubscribed or the subscription expired.
        if (isWebPushError(err) && (err.statusCode === 404 || err.statusCode === 410)) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          pruned++;
        } else {
          console.error(`Failed to send to ${user.email}:`, err);
        }
      }
    }
  }

  console.log(
    `Sent ${sent}, skipped ${skipped} (not due), pruned ${pruned} dead subscriptions.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
