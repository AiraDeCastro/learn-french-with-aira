"use client";

import Link from "next/link";
import { api } from "@/trpc/react";

export default function LessonsPage() {
  const { data: lessons, isLoading } = api.lesson.list.useQuery();

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Lessons</h1>
        <Link
          href="/admin/lessons/new"
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
        >
          New lesson
        </Link>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}

      {lessons && lessons.length === 0 && (
        <p className="text-sm text-neutral-500">No lessons yet. Create the first one.</p>
      )}

      <ul className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800">
        {lessons?.map((lesson) => (
          <li key={lesson.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium">{lesson.title}</p>
              <p className="text-xs text-neutral-500">
                {lesson.level} · {lesson.type.replace("_", " ").toLowerCase()} ·{" "}
                {lesson.topicTags.join(", ") || "no tags"}
                {!lesson.audioUrl && " · no audio yet"}
              </p>
            </div>
            <div className="flex gap-4">
              <Link
                href={`/learn/${lesson.id}`}
                className="text-sm font-medium text-green-700 hover:underline dark:text-green-400"
              >
                Read
              </Link>
              <Link
                href={`/admin/lessons/${lesson.id}/edit`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                Edit
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
