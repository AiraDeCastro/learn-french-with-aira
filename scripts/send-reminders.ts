/**
 * Manually invoked sender for the daily reminder push notification (PRD
 * §7) — kept for local testing. The real scheduled sender is
 * src/app/api/cron/reminders/route.ts, triggered hourly by
 * .github/workflows/reminders.yml; this script shares its core logic
 * (src/server/reminders.ts) but runs standalone via its own Prisma client,
 * the same pattern prisma/seed.ts uses to run outside the Next.js runtime.
 *
 * Run by hand: `npm run reminders:send`. Pass `--all` to ignore the hour
 * check and send to every subscribed user, for testing.
 */
import "dotenv/config";
import webpush from "web-push";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { sendDueReminders } from "../src/server/reminders";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const sendToAll = process.argv.includes("--all");

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

  const result = await sendDueReminders(prisma, webpush.sendNotification.bind(webpush), {
    all: sendToAll,
  });

  console.log(
    `Sent ${result.sent}, skipped ${result.skipped} (not due), pruned ${result.pruned} dead subscriptions.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
