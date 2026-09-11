import "dotenv/config";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    // These are integration tests hitting one shared local Postgres
    // connection pool (see src/server/db.ts). Running test files in
    // parallel workers was corrupting Postgres's unnamed prepared-statement
    // protocol across files ("bind message supplies N parameters, but
    // prepared statement requires 0") — running files sequentially removes
    // the cross-file connection race. The suite is small enough that this
    // doesn't meaningfully slow things down.
    fileParallelism: false,
  },
});
