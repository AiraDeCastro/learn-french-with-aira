import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

describe("notificationsRouter", () => {
  const TEST_EMAIL = "notifications-router-test@aira.test";
  let userId: string;

  beforeAll(async () => {
    const user = await db.user.upsert({
      where: { email: TEST_EMAIL },
      update: {},
      create: { email: TEST_EMAIL },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await db.pushSubscription.deleteMany({ where: { userId } });
    await db.user.delete({ where: { id: userId } });
  });

  it("starts with no subscription and no reminder hour", async () => {
    const caller = appRouter.createCaller({ db, userId });
    const settings = await caller.notifications.getReminderSettings();
    expect(settings).toEqual({ reminderHour: null, hasSubscription: false });
  });

  it("records a subscription and a reminder hour", async () => {
    const caller = appRouter.createCaller({ db, userId });

    await caller.notifications.subscribe({
      endpoint: "https://push.example.com/abc123",
      keys: { p256dh: "test-p256dh", auth: "test-auth" },
    });
    await caller.notifications.setReminderHour({ hour: 8 });

    const settings = await caller.notifications.getReminderSettings();
    expect(settings.hasSubscription).toBe(true);
    expect(settings.reminderHour).toBe(8);
  });

  it("re-subscribing the same endpoint updates rather than duplicates", async () => {
    const caller = appRouter.createCaller({ db, userId });

    await caller.notifications.subscribe({
      endpoint: "https://push.example.com/abc123",
      keys: { p256dh: "updated-p256dh", auth: "updated-auth" },
    });

    const count = await db.pushSubscription.count({
      where: { endpoint: "https://push.example.com/abc123" },
    });
    expect(count).toBe(1);
  });

  it("refuses to let a different user unsubscribe someone else's endpoint — regression test for the M5 access-control gap", async () => {
    const otherUser = await db.user.upsert({
      where: { email: "notifications-other-user-test@aira.test" },
      update: {},
      create: { email: "notifications-other-user-test@aira.test" },
    });
    const otherCaller = appRouter.createCaller({ db, userId: otherUser.id });

    await otherCaller.notifications.unsubscribe({
      endpoint: "https://push.example.com/abc123",
    });

    // Still there — the other user's unsubscribe call touched 0 rows.
    const settings = await appRouter
      .createCaller({ db, userId })
      .notifications.getReminderSettings();
    expect(settings.hasSubscription).toBe(true);

    await db.user.delete({ where: { id: otherUser.id } });
  });

  it("removes a subscription on unsubscribe", async () => {
    const caller = appRouter.createCaller({ db, userId });

    await caller.notifications.unsubscribe({
      endpoint: "https://push.example.com/abc123",
    });

    const settings = await caller.notifications.getReminderSettings();
    expect(settings.hasSubscription).toBe(false);
  });
});
