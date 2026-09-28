/**
 * Pure credential check for the reminders cron route
 * (src/app/api/cron/reminders/route.ts) — kept separate and dependency-free
 * so it can be unit-tested directly, same reasoning as admin-auth.ts.
 *
 * A scheduled GitHub Actions workflow calls that route hourly with a shared
 * secret (CRON_SECRET) in the Authorization header, since this project's
 * Vercel plan (Hobby) only runs its own native Cron once a day — too coarse
 * to honor each learner's own reminder hour. The Bearer-token shape matches
 * Vercel's own documented cron-protection convention, so switching to
 * native Vercel Cron later (on a paid plan) needs no code change here, just
 * a vercel.json.
 */
export function isValidCronAuth(
  authHeader: string | null,
  expectedSecret: string,
): boolean {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice("Bearer ".length);
  return token.length > 0 && token === expectedSecret;
}
