import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // jsdom (used only by import.ts's article extraction) has a transitive
  // dependency chain that crashes when Turbopack bundles it into the
  // server chunk — a CJS `require()` of a pure-ESM module deep inside
  // html-encoding-sniffer. Excluding it from bundling lets Node's own
  // module resolution load it at runtime instead, which doesn't hit that
  // interop issue. Confirmed necessary in production (Vercel); local dev
  // and `next build` never surfaced it, since Turbopack's dev/build
  // bundling path apparently tolerates the ESM mismatch differently than
  // the deployed runtime does.
  serverExternalPackages: ["jsdom"],
};

export default nextConfig;
