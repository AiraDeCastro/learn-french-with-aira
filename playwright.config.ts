import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Not parallel: all tests share one local-dev-user fallback (no real
  // auth yet — see current-user.ts) and one local Postgres connection that
  // corrupts under concurrent queries (see CLAUDE.md's Promise.all note).
  // Both are reasons to run one test at a time, not test-isolation theater.
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
