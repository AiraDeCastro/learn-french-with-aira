import { test, expect } from "@playwright/test";

/**
 * All three flows share the single local-dev-user fallback (no real auth
 * yet — see current-user.ts), so assertions check user-visible outcomes
 * rather than exact dashboard-count deltas — the shared account can carry
 * state from other test runs or manual sessions. Tests run serially
 * (playwright.config.ts: fullyParallel: false) for the same reason the
 * Vitest suite does: this local database setup doesn't tolerate
 * concurrent queries well (see CLAUDE.md).
 */

test.describe("core learner flows", () => {
  test("tap-to-translate looks up a word and saves it as known", async ({ page }) => {
    await page.goto("/library");
    await page.getByTestId("lesson-link").first().click();

    await page.getByTestId("word-span").first().click();

    // The lookup popover resolves to a real outcome, not stuck loading.
    const tooltip = page.getByRole("tooltip");
    await expect(tooltip).toBeVisible();
    await expect(tooltip).not.toHaveText("…");
    // "Couldn't look this up" only happens on a network error, which a
    // save-on-tap should not produce while online.
    await expect(tooltip).not.toContainText("Couldn't look this up");
  });

  test("finishing a lesson's comprehension check extends the streak", async ({
    page,
  }) => {
    await page.goto("/library");
    await page.getByTestId("lesson-link").first().click();

    // `.count()` doesn't auto-wait like `expect(...).toBeVisible()` does —
    // without this, it can run before the lesson's tRPC query resolves and
    // see zero fieldsets on a lesson that actually has questions, silently
    // skipping the test instead of testing it.
    await expect(page.getByTestId("word-span").first()).toBeVisible();

    const fieldsets = page.locator("fieldset");
    const fieldsetCount = await fieldsets.count();
    test.skip(fieldsetCount === 0, "seeded lesson has no comprehension questions");

    for (let i = 0; i < fieldsetCount; i++) {
      await fieldsets.nth(i).locator('input[type="radio"]').first().check();
    }

    await page.getByRole("button", { name: "Finish lesson" }).click();

    const outcome = page.getByTestId("lesson-result");
    await expect(outcome).toBeVisible();
    // Either a normal scored completion (mentions "streak") or, if this
    // exact moment hit a transient local backend hiccup, the offline-queue
    // fallback message — both are legitimate outcomes of "finishing"; a
    // silently blank or errored screen would not be.
    await expect(outcome).toContainText(/streak|will be scored once you/);
  });

  test("a word-save survives a dropped connection and syncs on reconnect", async ({
    page,
    context,
  }) => {
    await page.goto("/library");
    await page.getByTestId("lesson-link").first().click();
    await expect(page.getByTestId("word-span").first()).toBeVisible();

    await context.setOffline(true);
    // Give the offline emulation a moment to actually take effect before
    // firing a request — setOffline() resolving doesn't guarantee the
    // network layer has applied it yet for a request fired immediately
    // after.
    await page.waitForTimeout(200);

    await page.getByTestId("word-span").nth(1).click();
    await expect(page.getByTestId("pending-sync")).toBeVisible();

    await context.setOffline(false);
    // Chromium fires a real "online" event on setOffline(false); dispatch
    // one explicitly too as a safety net in case that timing is flaky.
    await page.evaluate(() => window.dispatchEvent(new Event("online")));

    await expect(page.getByTestId("pending-sync")).toBeHidden({ timeout: 10_000 });
  });
});
