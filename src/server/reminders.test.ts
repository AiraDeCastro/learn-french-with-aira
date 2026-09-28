import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { currentHourFor, sendDueReminders } from "./reminders";

describe("currentHourFor", () => {
  it("returns the hour in the given timezone, not the system timezone", () => {
    // Noon UTC is 7am in New York (UTC-5, no DST in January).
    const noonUtc = new Date("2026-01-15T12:00:00Z");
    expect(currentHourFor("UTC", noonUtc)).toBe(12);
    expect(currentHourFor("America/New_York", noonUtc)).toBe(7);
  });
});

describe("sendDueReminders", () => {
  const TEST_EMAIL = "reminders-test@aira.test";
  let userId: string;

  beforeEach(async () => {
    const user = await db.user.upsert({
      where: { email: TEST_EMAIL },
      update: { reminderHour: 9, timezone: "UTC" },
      create: { email: TEST_EMAIL, reminderHour: 9, timezone: "UTC" },
    });
    userId = user.id;
    await db.pushSubscription.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await db.pushSubscription.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  });

  it("sends to a due, subscribed user and reports the count", async () => {
    await db.pushSubscription.create({
      data: { userId, endpoint: "https://push.example.com/due", p256dh: "p", auth: "a" },
    });
    const sendNotification = vi.fn().mockResolvedValue(undefined);

    const result = await sendDueReminders(db, sendNotification, { all: true });

    expect(sendNotification).toHaveBeenCalledTimes(1);
    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.example.com/due", keys: { p256dh: "p", auth: "a" } },
      expect.any(String),
    );
    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("skips a user whose reminder hour doesn't match now, unless `all` is set", async () => {
    await db.pushSubscription.create({
      data: {
        userId,
        endpoint: "https://push.example.com/not-due",
        p256dh: "p",
        auth: "a",
      },
    });
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    // 3am UTC never matches this user's reminderHour of 9, regardless of when the test runs.
    const threeAmUtc = new Date("2026-01-15T03:00:00Z");

    const result = await sendDueReminders(db, sendNotification, { now: threeAmUtc });

    expect(sendNotification).not.toHaveBeenCalled();
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("prunes a subscription that web-push reports as gone (404/410)", async () => {
    const sub = await db.pushSubscription.create({
      data: { userId, endpoint: "https://push.example.com/dead", p256dh: "p", auth: "a" },
    });
    const sendNotification = vi
      .fn()
      .mockRejectedValue({ statusCode: 410, message: "gone" });

    const result = await sendDueReminders(db, sendNotification, { all: true });

    expect(result.pruned).toBe(1);
    const stillThere = await db.pushSubscription.findUnique({ where: { id: sub.id } });
    expect(stillThere).toBeNull();
  });

  it("does not prune on a non-410/404 send failure", async () => {
    await db.pushSubscription.create({
      data: {
        userId,
        endpoint: "https://push.example.com/flaky",
        p256dh: "p",
        auth: "a",
      },
    });
    const sendNotification = vi
      .fn()
      .mockRejectedValue({ statusCode: 500, message: "oops" });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendDueReminders(db, sendNotification, { all: true });

    expect(result.pruned).toBe(0);
    errorSpy.mockRestore();
  });
});
