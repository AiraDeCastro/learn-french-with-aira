import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

describe("onboardingRouter", () => {
  const TEST_EMAIL = "onboarding-router-test@aira.test";
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
    await db.user.delete({ where: { id: userId } });
  });

  it("reports incomplete before onboarding runs", async () => {
    const caller = appRouter.createCaller({ db, userId });
    const status = await caller.onboarding.getStatus();
    expect(status.completed).toBe(false);
  });

  it("saves goal and interests, then reports complete", async () => {
    const caller = appRouter.createCaller({ db, userId });

    await caller.onboarding.complete({ goal: "travel", interests: ["food", "friends"] });

    const status = await caller.onboarding.getStatus();
    expect(status.completed).toBe(true);
    expect(status.goal).toBe("travel");
    expect(status.interests).toEqual(["food", "friends"]);
  });
});
