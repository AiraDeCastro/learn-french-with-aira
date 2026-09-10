"use client";

import { use } from "react";
import { api } from "@/trpc/react";
import { LessonForm } from "../../_components/LessonForm";
import type { LessonFormValues } from "../../_components/types";

export default function EditLessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: lesson, isLoading, error } = api.lesson.getById.useQuery({ id });

  if (isLoading) return <div className="p-8 text-sm text-neutral-500">Loading…</div>;
  if (error || !lesson)
    return <div className="p-8 text-sm text-red-600">Lesson not found.</div>;

  const initialValues: LessonFormValues = {
    title: lesson.title,
    level: lesson.level,
    type: lesson.type,
    sourceType: lesson.sourceType,
    topicTags: lesson.topicTags,
    bodyText: lesson.bodyText,
    translation: lesson.translation ?? "",
    audioUrl: lesson.audioUrl ?? "",
    coverImageUrl: lesson.coverImageUrl ?? "",
    segments: lesson.segments.map((s) => ({
      order: s.order,
      text: s.text,
      startMs: s.startMs,
      endMs: s.endMs,
    })),
    questions: lesson.questions.map((q) => ({
      order: q.order,
      prompt: q.prompt,
      choices: q.choices,
      correctIndex: q.correctIndex,
    })),
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-semibold">Edit lesson</h1>
      <LessonForm lessonId={id} initialValues={initialValues} />
    </div>
  );
}
