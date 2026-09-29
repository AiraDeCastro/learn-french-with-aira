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
    // A dedicated port, not 3000: this machine often has another project's
    // dev server already bound to 3000, and `reuseExistingServer` below
    // would silently attach to *that* server instead of failing loudly —
    // discovered when a full E2E run passed its "server is up" check but
    // every test then failed against a totally unrelated site's homepage.
    baseURL: "http://localhost:3100",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
