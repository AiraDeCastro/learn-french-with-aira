import { describe, expect, it } from "vitest";
import { isValidAdminAuth } from "./admin-auth";

function basicHeader(username: string, password: string): string {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

describe("isValidAdminAuth", () => {
  it("accepts the correct password, with any username", () => {
    expect(isValidAdminAuth(basicHeader("admin", "correct-horse"), "correct-horse")).toBe(
      true,
    );
    expect(isValidAdminAuth(basicHeader("aira", "correct-horse"), "correct-horse")).toBe(
      true,
    );
    expect(isValidAdminAuth(basicHeader("", "correct-horse"), "correct-horse")).toBe(
      true,
    );
  });

  it("rejects the wrong password", () => {
    expect(isValidAdminAuth(basicHeader("admin", "wrong"), "correct-horse")).toBe(false);
  });

  it("rejects a missing header", () => {
    expect(isValidAdminAuth(null, "correct-horse")).toBe(false);
  });

  it("rejects a non-Basic scheme", () => {
    expect(isValidAdminAuth("Bearer sometoken", "correct-horse")).toBe(false);
  });

  it("rejects malformed base64", () => {
    expect(isValidAdminAuth("Basic not-valid-base64!!!", "correct-horse")).toBe(false);
  });

  it("rejects a header with no colon separator", () => {
    expect(isValidAdminAuth(`Basic ${btoa("justausername")}`, "correct-horse")).toBe(
      false,
    );
  });

  it("rejects an empty password even if the expected password is also empty", () => {
    expect(isValidAdminAuth(basicHeader("admin", ""), "")).toBe(false);
  });

  it("a password that is a prefix of the real one is still rejected", () => {
    expect(isValidAdminAuth(basicHeader("admin", "correct"), "correct-horse")).toBe(
      false,
    );
  });
});
