"use client";

import Link from "next/link";
import { api } from "@/trpc/react";

const LEVELS: { level: string; label: string; description: string; accent: string }[] = [
  {
    level: "A1",
    label: "Absolute beginner",
    description: "Mini-stories built on 30–40 words, repeated until they stick.",
    accent: "border-emerald-500 dark:border-emerald-400",
  },
  {
    level: "A2",
    label: "Elementary",
    description: "Longer stories and audio, at a natural-ish pace.",
    accent: "border-teal-500 dark:border-teal-400",
  },
  {
    level: "B1",
    label: "Intermediate",
    description: "Learner podcasts and simplified news — the bridge to real French.",
    accent: "border-sky-500 dark:border-sky-400",
  },
  {
    level: "B2",
    label: "Upper intermediate",
    description: "Bring in your own articles and videos; native news at speed.",
    accent: "border-indigo-500 dark:border-indigo-400",
  },
  {
    level: "C1",
    label: "Advanced",
    description: "French novels, native podcasts, audiobooks.",
    accent: "border-violet-500 dark:border-violet-400",
  },
  {
    level: "Pro",
    label: "C2 — native level",
    description: "Radio, film with no subtitles, whatever you're actually into.",
    accent: "border-fuchsia-500 dark:border-fuchsia-400",
  },
];

const LOOP_STEPS: { title: string; description: string }[] = [
  {
    title: "Open today's pick",
    description:
      "One lesson, chosen for your level and interests — no browsing required.",
  },
  {
    title: "Read and listen",
    description: "Text and audio together. Tap any word you don't know and keep going.",
  },
  {
    title: "A short check",
    description:
      "Confirms the lesson counts, then your streak and known-word count update.",
  },
  {
    title: "Stop, or keep going",
    description: "The streak's secured either way — go further if you're in the mood.",
  },
];

function LandingContent() {
  return (
    <div className="flex flex-col">
      <div className="w-full bg-gradient-to-br from-violet-50 via-fuchsia-50 to-transparent dark:from-violet-950/40 dark:via-fuchsia-950/30">
        <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-6 px-6 py-16 sm:py-24">
          <h1 className="text-3xl font-semibold sm:text-4xl">Learn French with Aira</h1>
          <p className="text-lg text-neutral-500 dark:text-neutral-400">
            Read and listen to French you can mostly understand, a little above where you
            are — that&apos;s the whole method.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/onboarding"
              className="rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white transition hover:scale-105 dark:from-violet-300 dark:to-fuchsia-300 dark:text-neutral-900"
            >
              Get started
            </Link>
            <Link
              href="/library"
              className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Browse the library →
            </Link>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Two minutes to get started.
          </p>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-xl px-6 py-16">
          <h2 className="text-xl font-semibold">Why this actually works</h2>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            Most language apps reward finishing exercises, not understanding French — you
            can &ldquo;complete&rdquo; a tree of lessons and still not follow a podcast.
            Comprehensible input is different: you read and listen to things you mostly
            understand, slightly above your level, and that&apos;s what actually builds
            fluency.
          </p>
          <ul className="mt-5 flex flex-col gap-3 text-neutral-500 dark:text-neutral-400">
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                Look up a word and keep going.
              </span>{" "}
              No dictionary detours — tapping a word saves it and gets right back out of
              your way.
            </li>
            <li>
              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                Reading and listening together.
              </span>{" "}
              Your eyes fill in what your ears miss, and vice versa.
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-xl px-6 py-16">
          <h2 className="text-xl font-semibold">From your first bonjour to Pro</h2>
          <p className="mt-3 text-neutral-500 dark:text-neutral-400">
            Every piece of content is leveled A1 through C2, so there&apos;s always
            somewhere to go next.
          </p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LEVELS.map((item) => (
              <div
                key={item.level}
                className={`rounded-xl border-l-4 bg-neutral-50 p-4 transition hover:-translate-y-1 hover:shadow-md dark:bg-neutral-900 ${item.accent}`}
              >
                <p className="text-xs tracking-wide text-neutral-500 uppercase dark:text-neutral-400">
                  {item.level} · {item.label}
                </p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-xl px-6 py-16">
          <h2 className="text-xl font-semibold">What a day looks like</h2>
          <ol className="mt-5 flex flex-col gap-5">
            {LOOP_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 text-sm font-medium text-white dark:from-violet-300 dark:to-fuchsia-300 dark:text-neutral-900">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="border-t border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto flex max-w-xl flex-col items-start gap-4 px-6 py-16">
          <h2 className="text-xl font-semibold">Ready when you are</h2>
          <Link
            href="/onboarding"
            className="rounded-full transition hover:scale-105 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-medium text-white dark:from-violet-300 dark:to-fuchsia-300 dark:text-neutral-900"
          >
            Get started
          </Link>
        </div>
      </div>
    </div>
  );
}

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
    return <LandingContent />;
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
            className="mt-4 inline-block rounded-full transition hover:scale-105 bg-gradient-to-r from-violet-600 to-fuchsia-600 px-5 py-2.5 text-sm font-medium text-white dark:from-violet-300 dark:to-fuchsia-300 dark:text-neutral-900"
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
