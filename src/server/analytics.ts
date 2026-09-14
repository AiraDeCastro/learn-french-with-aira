import type { Prisma, PrismaClient } from "@/generated/prisma/client";

/**
 * The only two events needed to derive every PRD §10 metric:
 * - `lesson_started` + `lesson_completed` together give the completion rate.
 * - Either event, deduped by user + calendar day, gives D7/D30 retention.
 * - `lesson_completed`'s `durationSeconds` property sums to weekly input
 *   hours; its `streakCurrentCount` property gives the streak-length
 *   distribution.
 * Add a new event name here deliberately, not reflexively — see TASKS.md's
 * M5 analytics item for the metric each one is meant to serve.
 */
type AnalyticsEventName = "lesson_started" | "lesson_completed";

/**
 * Fire-and-forget event logging. PostHog itself isn't wired up yet (blocked
 * on Aira creating a PostHog account — TASKS.md M0); events land in the
 * `AnalyticsEvent` table instead so nothing is lost, and can be backfilled
 * into PostHog once that account exists — this function is the one place
 * that will need to also forward there.
 *
 * Always await this rather than firing it in the background: the local dev
 * database proxy corrupts its prepared-statement protocol under concurrent
 * queries on one connection (see CLAUDE.md's `connection_limit=1` note), so
 * an un-awaited write racing the caller's own queries would reintroduce
 * that exact bug.
 *
 * A tracking failure must never break the action it's attached to, so
 * errors are swallowed here rather than left for the caller to handle.
 */
export async function track(
  db: PrismaClient,
  params: {
    userId: string;
    event: AnalyticsEventName;
    properties?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await db.analyticsEvent.create({
      data: {
        userId: params.userId,
        event: params.event,
        properties: (params.properties ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch {
    // Best-effort only — see doc comment above.
  }
}
