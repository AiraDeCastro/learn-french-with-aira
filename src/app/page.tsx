"use client";

import Link from "next/link";
import { api } from "@/trpc/react";

export default function Home() {
  const { data: status, isLoading: statusLoading } = api.onboarding.getStatus.useQuery();
  const { data: lesson, isLoading: lessonLoading } =
    api.progress.recommendNextLesson.useQuery(undefined, {
      enabled: status?.completed === true,
    });
  const { data: dashboard } = api.progress.getDashboard.useQuery(undefined, {
    enabled: status?.completed === true,
  });

  if (statusLoading) {
    return (
      <div className="p-8 text-sm text-neutral-500 dark:text-neutral-400">Loading…</div>
    );
  }

  if (!status?.completed) {
    return (
      <div className="mx-auto flex max-w-xl flex-1 flex-col items-start justify-center gap-6 p-8">
        <h1 className="text-3xl font-semibold">Learn French with Aira</h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Read and listen to French you can mostly understand, a little above where you
          are — that&apos;s the whole method. Two minutes to get started.
        </p>
        <Link
          href="/onboarding"
          className="rounded bg-neutral-900 px-5 py-3 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          Get started
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Today</h1>
        {dashboard && dashboard.streak.currentCount > 0 && (
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            🔥 {dashboard.streak.currentCount}-day streak
          </span>
        )}
      </header>

      {lessonLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Finding your next lesson…
        </p>
      )}

      {!lessonLoading && !lesson && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No lessons in the library yet.{" "}
          <Link href="/admin/lessons/new" className="underline">
            Add one
          </Link>
          .
        </p>
      )}

      {lesson && (
        <div className="rounded border border-neutral-200 p-5 dark:border-neutral-800">
          <p className="text-xs tracking-wide text-neutral-500 dark:text-neutral-400 uppercase">
            {lesson.level} · {lesson.type.replace("_", " ").toLowerCase()}
          </p>
          <h2 className="mt-1 text-xl font-semibold">{lesson.title}</h2>
          {lesson.topicTags.length > 0 && (
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
              {lesson.topicTags.join(", ")}
            </p>
          )}
          <Link
            href={`/learn/${lesson.id}`}
            className="mt-4 inline-block rounded bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
          >
            Start lesson
          </Link>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        <Link
          href="/library"
          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Browse the library →
        </Link>
        <Link
          href="/dashboard"
          className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          Your progress →
        </Link>
      </div>
    </div>
  );
}
