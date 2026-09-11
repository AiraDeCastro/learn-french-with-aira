"use client";

import { use } from "react";
import { api } from "@/trpc/react";
import { Reader } from "./_components/Reader";

export default function LearnLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: lesson, isLoading, error } = api.lesson.getById.useQuery({ id });

  if (isLoading) return <div className="p-8 text-sm text-neutral-500">Loading…</div>;
  if (error || !lesson)
    return <div className="p-8 text-sm text-red-600">Lesson not found.</div>;

  return <Reader lesson={lesson} />;
}
