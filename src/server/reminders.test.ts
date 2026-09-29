import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/server/db";
import { currentHourFor, sendDueReminders, sendEmailViaResend } from "./reminders";

describe("currentHourFor", () => {
  it("returns the hour in the given timezone, not the system timezone", () => {
    // Noon UTC is 7am in New York (UTC-5, no DST in January).
    const noonUtc = new Date("2026-01-15T12:00:00Z");
    expect(currentHourFor("UTC", noonUtc)).toBe(12);
    expect(currentHourFor("America/New_York", noonUtc)).toBe(7);
  });
});

describe("sendEmailViaResend", () => {
  const originalKey = process.env.AUTH_RESEND_KEY;
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    process.env.AUTH_RESEND_KEY = originalKey;
    fetchSpy.mockRestore();
  });

  it("throws without posting if AUTH_RESEND_KEY isn't set", async () => {
    delete process.env.AUTH_RESEND_KEY;

    await expect(sendEmailViaResend("a@b.test", "Subject", "<p>hi</p>")).rejects.toThrow(
      "AUTH_RESEND_KEY",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts to Resend's API with the expected shape", async () => {
    process.env.AUTH_RESEND_KEY = "re_test_key";
    fetchSpy.mockResolvedValueOnce(new Response("{}", { status: 200 }));

    await sendEmailViaResend("a@b.test", "Subject", "<p>hi</p>");

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer re_test_key" }),
      }),
    );
    const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ to: "a@b.test", subject: "Subject", html: "<p>hi</p>" });
  });

  it("throws on a non-ok response", async () => {
    process.env.AUTH_RESEND_KEY = "re_test_key";
    fetchSpy.mockResolvedValueOnce(new Response("bad request", { status: 422 }));

    await expect(sendEmailViaResend("a@b.test", "Subject", "<p>hi</p>")).rejects.toThrow(
      "422",
    );
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

  // Assertions below check for a call matching this specific test's user/
  // endpoint, never a bare "not called at all" or exact call count — this
  // suite runs against the real shared local/CI database (see CLAUDE.md's
  // commit-workflow notes), and `{ all: true }` deliberately matches every
  // due-eligible user in it, not just this file's own fixture. A stray real
  // user with an hour set and no push subscription (e.g. leftover manual
  // testing, or another test file's fixture mid-run) would otherwise make
  // these tests flaky for reasons that have nothing to do with what they're
  // actually testing.
  function callsFor(mock: ReturnType<typeof vi.fn>, firstArg: unknown) {
    return mock.mock.calls.filter((call) => call[0] === firstArg);
  }

  it("sends to a due, subscribed user and reports the count", async () => {
    await db.pushSubscription.create({
      data: { userId, endpoint: "https://push.example.com/due", p256dh: "p", auth: "a" },
    });
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await sendDueReminders(db, sendNotification, sendEmail, { all: true });

    expect(sendNotification).toHaveBeenCalledWith(
      { endpoint: "https://push.example.com/due", keys: { p256dh: "p", auth: "a" } },
      expect.any(String),
    );
    expect(callsFor(sendEmail, TEST_EMAIL)).toHaveLength(0);
    expect(result.sent).toBeGreaterThanOrEqual(1);
  });

  it("emails a due user with no push subscription instead — the PRD §7 fallback", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    const result = await sendDueReminders(db, sendNotification, sendEmail, { all: true });

    expect(callsFor(sendEmail, TEST_EMAIL)).toHaveLength(1);
    expect(sendEmail).toHaveBeenCalledWith(
      TEST_EMAIL,
      expect.any(String),
      expect.any(String),
    );
    expect(result.emailed).toBeGreaterThanOrEqual(1);
  });

  it("doesn't email a user who has a push subscription", async () => {
    await db.pushSubscription.create({
      data: { userId, endpoint: "https://push.example.com/due2", p256dh: "p", auth: "a" },
    });
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    await sendDueReminders(db, sendNotification, sendEmail, { all: true });

    expect(callsFor(sendEmail, TEST_EMAIL)).toHaveLength(0);
  });

  it("a failed email is logged, not thrown, and doesn't count as sent", async () => {
    const sendNotification = vi.fn().mockResolvedValue(undefined);
    const sendEmail = vi.fn().mockRejectedValue(new Error("Resend is down"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendDueReminders(db, sendNotification, sendEmail, { all: true });

    expect(result.emailed).toBe(0);
    errorSpy.mockRestore();
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
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    // 3am UTC never matches this user's reminderHour of 9, regardless of when the test runs.
    const threeAmUtc = new Date("2026-01-15T03:00:00Z");

    const result = await sendDueReminders(db, sendNotification, sendEmail, {
      now: threeAmUtc,
    });

    expect(sendNotification).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
    expect(result.skipped).toBeGreaterThanOrEqual(1);
  });

  it("prunes a subscription that web-push reports as gone (404/410)", async () => {
    const sub = await db.pushSubscription.create({
      data: { userId, endpoint: "https://push.example.com/dead", p256dh: "p", auth: "a" },
    });
    // Rejects only for this test's own endpoint — `{ all: true }` matches
    // every due user in the shared database (see the note above `callsFor`),
    // and a mock that rejects unconditionally would prune a real, unrelated
    // user's real push subscription as a side effect if one happened to
    // exist and be due too.
    const sendNotification = vi
      .fn()
      .mockImplementation((subscription) =>
        subscription.endpoint === "https://push.example.com/dead"
          ? Promise.reject({ statusCode: 410, message: "gone" })
          : Promise.resolve(undefined),
      );
    const sendEmail = vi.fn().mockResolvedValue(undefined);

    await sendDueReminders(db, sendNotification, sendEmail, { all: true });

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
    const sendEmail = vi.fn().mockResolvedValue(undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendDueReminders(db, sendNotification, sendEmail, { all: true });

    expect(result.pruned).toBe(0);
    errorSpy.mockRestore();
  });
});
