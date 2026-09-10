#!/usr/bin/env node
/**
 * Pre-commit / CI gate for `npm audit`.
 *
 * Plain `npm audit` can't be used as a hard gate as-is: npm's `--omit=dev`
 * flag does not actually remove devDependencies from the audit graph (a
 * known npm limitation), so this would permanently block every commit on
 * advisories that live entirely inside Prisma CLI's own bundled MySQL
 * introspection tooling — dev-only, and never invoked by this project,
 * which is Postgres-only. No fix is available without downgrading Prisma
 * two major versions.
 *
 * Instead of weakening the check (raising the severity threshold) or
 * disabling it, this fails on any high/critical vulnerability that is NOT
 * on the reviewed allowlist below — so a genuinely new vulnerability still
 * blocks the commit, while these two known, accepted findings don't.
 *
 * Re-review the allowlist whenever `npm audit` output changes shape, and
 * drop an entry once Prisma ships a fix (check by removing it here and
 * re-running).
 */
import { execSync } from "node:child_process";

/** @type {Record<string, { reason: string; reviewedOn: string }>} */
const ALLOWLIST = {
  "deepmerge-ts": {
    reason:
      "Stack-exhaustion advisory inside prisma's devDependency-only config-merging tool (@prisma/config). Not reachable from app code.",
    reviewedOn: "2026-09-09",
  },
  mysql2: {
    reason:
      "Auth-downgrade/decompression-bomb advisories inside Prisma CLI's bundled MySQL introspection support. This project is Postgres-only and never invokes it.",
    reviewedOn: "2026-09-09",
  },
  "@prisma/config": {
    reason:
      "Only vulnerable transitively, via the allowlisted deepmerge-ts/mysql2 above.",
    reviewedOn: "2026-09-09",
  },
  prisma: {
    reason: "Only vulnerable transitively, via the allowlisted @prisma/config above.",
    reviewedOn: "2026-09-09",
  },
};

function runAudit() {
  try {
    const out = execSync("npm audit --json", { encoding: "utf8" });
    return JSON.parse(out);
  } catch (err) {
    // npm audit exits non-zero the moment it finds anything; the JSON we
    // want is still on stdout.
    if (err.stdout) return JSON.parse(err.stdout);
    throw err;
  }
}

const data = runAudit();
const vulnerabilities = data.vulnerabilities ?? {};

const blocking = Object.entries(vulnerabilities).filter(
  ([name, v]) => (v.severity === "high" || v.severity === "critical") && !ALLOWLIST[name],
);

const allowlisted = Object.keys(vulnerabilities).filter((name) => ALLOWLIST[name]);

if (blocking.length > 0) {
  console.error(
    "New high/critical vulnerabilities found (not on the reviewed allowlist):\n",
  );
  for (const [name, v] of blocking) {
    console.error(`  - ${name} (${v.severity})`);
  }
  console.error("\nRun `npm audit` for full details.");
  console.error(
    "If this is genuinely unfixable right now, add it to ALLOWLIST in scripts/check-audit.mjs with a dated reason — don't silently raise the severity threshold instead.",
  );
  process.exit(1);
}

if (allowlisted.length > 0) {
  console.log(
    `npm audit: ${allowlisted.length} known, reviewed advisory package(s) allowlisted (dev-tooling only, no app-code path): ${allowlisted.join(", ")}`,
  );
}
console.log("npm audit: no unreviewed high/critical vulnerabilities.");
