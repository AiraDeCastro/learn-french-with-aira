import { describe, expect, it } from "vitest";
import { isValidCronAuth } from "./cron-auth";

describe("isValidCronAuth", () => {
  it("accepts the correct secret", () => {
    expect(isValidCronAuth("Bearer correct-secret", "correct-secret")).toBe(true);
  });

  it("rejects the wrong secret", () => {
    expect(isValidCronAuth("Bearer wrong-secret", "correct-secret")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidCronAuth(null, "correct-secret")).toBe(false);
  });

  it("rejects a non-Bearer scheme", () => {
    expect(isValidCronAuth("Basic correct-secret", "correct-secret")).toBe(false);
  });

  it("rejects an empty token even if the expected secret is also empty", () => {
    expect(isValidCronAuth("Bearer ", "")).toBe(false);
  });

  it("a token that is a prefix of the real secret is still rejected", () => {
    expect(isValidCronAuth("Bearer correct", "correct-secret")).toBe(false);
  });
});
