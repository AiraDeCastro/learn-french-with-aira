import { describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

describe("appRouter", () => {
  it("health.ping responds without a database", async () => {
    const caller = appRouter.createCaller({ db, userId: null });

    const result = await caller.health.ping();

    expect(result.status).toBe("ok");
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });
});
