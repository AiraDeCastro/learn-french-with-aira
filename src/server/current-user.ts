import { db } from "@/server/db";

const DEV_USER_EMAIL = "dev-local@aira.test";

/**
 * Resolves the acting user for the tRPC context (see trpc.ts). Real sign-in
 * isn't wired up with credentials until M4 (docs/TASKS.md) — until then this
 * falls back to a single seeded local-dev user, so the reader's real
 * persistence logic can be built and tested now instead of stubbed out. The
 * fallback is hard-disabled outside development so production can never
 * silently attribute progress to an anonymous user (PLANNING.md §2.2:
 * progress must be server-authoritative and tied to a real account).
 *
 * `@/auth` (next-auth) is imported dynamically, not at module scope: it
 * requires the real Next.js runtime and breaks module resolution under
 * Vitest. Tests never call this function — they construct their own
 * `{ db, userId }` context directly — but a static top-level import here
 * would still break them, since every router statically imports this
 * module's home (trpc.ts) just to get `publicProcedure`.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { auth } = await import("@/auth");
  const session = await auth();

  if (session?.user?.email) {
    const user = await db.user.upsert({
      where: { email: session.user.email },
      update: {},
      create: { email: session.user.email, name: session.user.name ?? undefined },
    });
    return user.id;
  }

  if (process.env.NODE_ENV === "production") return null;

  const devUser = await db.user.upsert({
    where: { email: DEV_USER_EMAIL },
    update: {},
    create: { email: DEV_USER_EMAIL, name: "Local Dev" },
  });
  return devUser.id;
}
