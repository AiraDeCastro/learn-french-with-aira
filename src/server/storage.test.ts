import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resolveMediaPath } from "./storage";

const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

describe("resolveMediaPath", () => {
  beforeAll(() => {
    mkdirSync(path.join(STORAGE_ROOT, "cover"), { recursive: true });
    writeFileSync(path.join(STORAGE_ROOT, "cover", "real.png"), "test");
    // A sibling directory whose name starts with "uploads" — the exact
    // shape that defeats a naive `startsWith(STORAGE_ROOT)` check.
    mkdirSync(path.join(process.cwd(), "storage", "uploads-evil"), { recursive: true });
    writeFileSync(
      path.join(process.cwd(), "storage", "uploads-evil", "secret.txt"),
      "secret",
    );
  });

  afterAll(() => {
    rmSync(path.join(process.cwd(), "storage", "uploads-evil"), {
      recursive: true,
      force: true,
    });
    rmSync(path.join(STORAGE_ROOT, "cover", "real.png"), { force: true });
  });

  it("resolves a real file inside the storage root", () => {
    const resolved = resolveMediaPath(["cover", "real.png"]);
    expect(resolved).toBe(path.join(STORAGE_ROOT, "cover", "real.png"));
  });

  it("returns null for a file that doesn't exist", () => {
    expect(resolveMediaPath(["cover", "nope.png"])).toBeNull();
  });

  it("returns null for directory traversal (..)", () => {
    expect(resolveMediaPath(["..", "uploads-evil", "secret.txt"])).toBeNull();
  });

  it("returns null for a sibling directory whose name merely starts with the same prefix", () => {
    // Regression test for the startsWith() bypass: "storage/uploads-evil"
    // starts with the string "storage/uploads" even though it's a
    // completely different directory.
    expect(resolveMediaPath(["../uploads-evil", "secret.txt"])).toBeNull();
  });
});
