/**
 * Pure credential-check for the admin HTTP Basic Auth gate (src/proxy.ts)
 * — kept separate and dependency-free so it can run on the Edge runtime
 * (middleware doesn't have Node's `Buffer`, only the Web-standard `atob`)
 * and be unit-tested directly, same reasoning as streak.ts/level-estimate.ts
 * keeping their tricky logic out of the router/framework layer.
 *
 * Any username is accepted — only the password matters, since this gates
 * one person's own admin panel, not a multi-account system. Comparison is
 * plain string equality, not timing-safe; an acceptable simplification for
 * a solo hobby project's admin gate, not a multi-tenant auth system.
 */
export function isValidAdminAuth(
  authHeader: string | null,
  expectedPassword: string,
): boolean {
  if (!authHeader?.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = atob(authHeader.slice("Basic ".length));
  } catch {
    return false;
  }

  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return false;
  const password = decoded.slice(separatorIndex + 1);

  return password.length > 0 && password === expectedPassword;
}
