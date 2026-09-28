import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { db } from "@/server/db";
import { isValidCronAuth } from "@/server/cron-auth";
import { sendDueReminders } from "@/server/reminders";

/**
 * Triggered hourly by a scheduled GitHub Actions workflow
 * (.github/workflows/reminders.yml), not Vercel's own Cron — this
 * project's Vercel plan (Hobby) only runs native Cron once a day, too
 * coarse to honor each learner's own reminder hour (PRD §7). Protected by
 * a shared secret rather than this app's admin Basic Auth (src/proxy.ts),
 * since a scheduled job needs a header it can send unattended, not a
 * browser-cached credential.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !isValidCronAuth(req.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 503 });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:dev-local@aira.test",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const result = await sendDueReminders(db, webpush.sendNotification.bind(webpush));
  return NextResponse.json(result);
}
