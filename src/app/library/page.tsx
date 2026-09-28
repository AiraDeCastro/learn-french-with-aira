"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

/** Same level→accent mapping as the landing page and reader (src/app/page.tsx, Reader.tsx), for visual consistency. */
const LEVEL_ACCENTS: Record<string, string> = {
  A1: "border-emerald-500 dark:border-emerald-400",
  A2: "border-teal-500 dark:border-teal-400",
  B1: "border-sky-500 dark:border-sky-400",
  B2: "border-indigo-500 dark:border-indigo-400",
  C1: "border-violet-500 dark:border-violet-400",
  C2: "border-fuchsia-500 dark:border-fuchsia-400",
};

export default function LibraryPage() {
  const [level, setLevel] = useState<string>("");
  const [topic, setTopic] = useState<string>("");

  const { data: lessons, isLoading } = api.lesson.list.useQuery();
  const { data: topics } = api.lesson.listTopics.useQuery();

  const filtered = (lessons ?? []).filter(
    (lesson) =>
      (level === "" || lesson.level === level) &&
      (topic === "" || lesson.topicTags.includes(topic)),
  );

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Library</h1>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          Every lesson, if you&apos;d rather pick your own path.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <div>
          <label
            htmlFor="levelFilter"
            className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400"
          >
            Level
          </label>
          <select
            id="levelFilter"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="topicFilter"
            className="mb-1 block text-xs text-neutral-500 dark:text-neutral-400"
          >
            Topic
          </label>
          <select
            id="topicFilter"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-full border border-neutral-300 px-3 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-500 dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">All topics</option>
            {topics?.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      )}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          No lessons match those filters.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {filtered.map((lesson) => (
          <li key={lesson.id}>
            <Link
              href={`/learn/${lesson.id}`}
              data-testid="lesson-link"
              className={`block rounded-xl border-l-4 bg-neutral-50 p-4 transition hover:-translate-y-1 hover:shadow-md dark:bg-neutral-900 ${LEVEL_ACCENTS[lesson.level] ?? "border-neutral-300 dark:border-neutral-700"}`}
            >
              <p className="font-medium">{lesson.title}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {lesson.level} · {lesson.type.replace("_", " ").toLowerCase()} ·{" "}
                {lesson.topicTags.join(", ") || "no tags"}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
