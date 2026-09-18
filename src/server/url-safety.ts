import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Basic SSRF guard for the "paste a link" import feature (PRD §7 V2): the
 * server fetches whatever URL a learner pastes, so that fetch must not be
 * usable to reach internal/private network services (a local database, a
 * cloud metadata endpoint, etc.). Blocks non-http(s) schemes, "localhost",
 * and any hostname that resolves to a private, loopback, or link-local
 * address.
 *
 * This is not a defense against DNS-rebinding — the actual `fetch()` call
 * re-resolves the hostname after this check passes, so a hostname that
 * changes its answer between the two lookups could still slip through.
 * Catching that needs pinning the resolved address for the fetch itself
 * (a custom dispatcher/agent), which is a real hardening step for later,
 * not something to build into this first pass.
 */
export async function assertPubliclyFetchable(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Not a valid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http:// and https:// links are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("That link points at a local address, not a public page.");
  }

  const addresses =
    isIP(hostname) !== 0
      ? [hostname]
      : (await lookup(hostname, { all: true })).map((a) => a.address);

  if (addresses.length === 0 || addresses.some(isPrivateOrLocalAddress)) {
    throw new Error("That link points at a private address, not a public page.");
  }

  return url;
}

/** Pure IP-range classification — no network access, so this is the part worth unit testing directly. */
export function isPrivateOrLocalAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true; // malformed — fail closed
    return (
      a === 127 || // loopback
      a === 10 || // 10.0.0.0/8
      (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12
      (a === 192 && b === 168) || // 192.168.0.0/16
      (a === 169 && b === 254) || // link-local
      a === 0
    );
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fe80:") || // link-local
      normalized.startsWith("fc") || // unique-local fc00::/7
      normalized.startsWith("fd") ||
      normalized.startsWith("::ffff:127.") // IPv4-mapped loopback
    );
  }
  return true; // not a recognizable IP shape — fail closed
}
