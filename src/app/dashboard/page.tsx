"use client";

import Link from "next/link";
import { api } from "@/trpc/react";
import { ReminderSettings } from "./_components/ReminderSettings";

function StatCard({
  label,
  value,
  sub,
  testId,
}: {
  label: string;
  value: string;
  sub?: string;
  testId?: string;
}) {
  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400 uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold" data-testid={testId}>
        {value}
      </p>
      {sub && (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{sub}</p>
      )}
    </div>
  );
}

function daysAgo(date: Date): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (24 * 60 * 60 * 1000));
}

export default function DashboardPage() {
  const { data, isLoading, error } = api.progress.getDashboard.useQuery();
  const { data: reviewWords } = api.progress.getWordsForReview.useQuery();

  if (isLoading)
    return (
      <div className="p-8 text-sm text-neutral-500 dark:text-neutral-400">Loading…</div>
    );
  if (error || !data)
    return (
      <div className="p-8 text-sm text-red-600">Couldn&apos;t load your progress.</div>
    );

  const { streak, levelEstimate, knownWordCount, hoursOfInput } = data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Your progress</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Level is a directional estimate, not a certified score.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Streak"
          value={`${streak.currentCount} day${streak.currentCount === 1 ? "" : "s"}`}
          sub={
            streak.freezeBalance > 0
              ? `${streak.freezeBalance} freeze${streak.freezeBalance === 1 ? "" : "s"} banked`
              : undefined
          }
          testId="stat-streak"
        />
        <StatCard label="Level" value={levelEstimate?.level ?? "Not yet set"} />
        <StatCard
          label="Known words"
          value={String(knownWordCount)}
          testId="stat-known-words"
        />
        <StatCard label="Hours of input" value={hoursOfInput.toFixed(1)} />
      </div>

      {levelEstimate?.basis && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Level estimate based on: {levelEstimate.basis}{" "}
          <Link href="/level-check" className="underline">
            Curious how you&apos;d place on DELF/DALF? Take the informal check
          </Link>
        </p>
      )}

      {!levelEstimate && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          You haven&apos;t taken the placement quiz yet.{" "}
          <Link href="/placement" className="underline">
            Take it now
          </Link>
          , or just start reading — your level updates automatically as you go.
        </p>
      )}

      {reviewWords && reviewWords.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">Words to revisit</h2>
          <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
            You haven&apos;t come across these in a couple of weeks — a nudge back into
            real content, not a flashcard drill.
          </p>
          <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
            {reviewWords.map((w) => (
              <li key={w.word} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="text-sm font-medium">{w.word}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    {w.definition ?? "No definition on file"} · last seen{" "}
                    {daysAgo(w.lastSeenAt)} days ago
                  </p>
                </div>
                {w.sourceLesson && (
                  <Link
                    href={`/learn/${w.sourceLesson.id}`}
                    className="shrink-0 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Revisit in &ldquo;{w.sourceLesson.title}&rdquo; →
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ReminderSettings />

      <Link
        href="/admin/lessons"
        className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
      >
        Browse lessons →
      </Link>
    </div>
  );
}
