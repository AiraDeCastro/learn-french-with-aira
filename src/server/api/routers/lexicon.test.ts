import { describe, expect, it } from "vitest";
import { appRouter } from "@/server/api/root";
import { db } from "@/server/db";

describe("lexiconRouter", () => {
  const caller = appRouter.createCaller({ db });

  it("looks up a seeded word case-insensitively", async () => {
    const result = await caller.lexicon.lookup({ word: "Chat" });
    expect(result?.definition).toBe("cat");
  });

  it("returns null for an unknown word", async () => {
    const result = await caller.lexicon.lookup({ word: "xyzzy-not-a-word" });
    expect(result).toBeNull();
  });
});
