import { describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

describe("appRouter", () => {
  it("health.ping responds without a database", async () => {
    const caller = appRouter.createCaller(createTRPCContext());

    const result = await caller.health.ping();

    expect(result.status).toBe("ok");
    expect(new Date(result.timestamp).toString()).not.toBe("Invalid Date");
  });
});
