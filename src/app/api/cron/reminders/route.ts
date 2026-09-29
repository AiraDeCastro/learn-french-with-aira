import { NextResponse, type NextRequest } from "next/server";
import webpush from "web-push";
import { db } from "@/server/db";
import { isValidCronAuth } from "@/server/cron-auth";
import {
  sendDueReminders,
  sendEmailViaResend,
  type SendNotification,
} from "@/server/reminders";

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

  // Push and email are independent fallback channels (PRD §7) — missing
  // credentials for one shouldn't stop the other from reaching anyone due.
  // Previously this route hard-503'd on missing VAPID keys, back when push
  // was the only channel; that's no longer the right failure mode now that
  // an email-only learner would be blocked by a push misconfiguration that
  // has nothing to do with them.
  const pushConfigured = Boolean(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
  );
  let sendNotification: SendNotification = () =>
    Promise.reject(new Error("VAPID keys not configured"));
  if (pushConfigured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:dev-local@aira.test",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );
    sendNotification = webpush.sendNotification.bind(webpush);
  }

  const result = await sendDueReminders(db, sendNotification, sendEmailViaResend);
  return NextResponse.json(result);
}
