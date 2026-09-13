"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/trpc/react";

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

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
        <p className="mt-1 text-sm text-neutral-500">
          Every lesson, if you&apos;d rather pick your own path.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        >
          <option value="">All topics</option>
          {topics?.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-neutral-500">No lessons match those filters.</p>
      )}

      <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {filtered.map((lesson) => (
          <li key={lesson.id} className="py-3">
            <Link href={`/learn/${lesson.id}`} className="block">
              <p className="font-medium">{lesson.title}</p>
              <p className="text-xs text-neutral-500">
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
