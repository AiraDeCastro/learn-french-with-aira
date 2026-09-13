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

  it("removes a subscription on unsubscribe", async () => {
    const caller = appRouter.createCaller({ db, userId });

    await caller.notifications.unsubscribe({
      endpoint: "https://push.example.com/abc123",
    });

    const settings = await caller.notifications.getReminderSettings();
    expect(settings.hasSubscription).toBe(false);
  });
});
