"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";
import { uploadFile } from "./uploadFile";
import {
  EMPTY_LESSON,
  type LessonFormValues,
  type QuestionDraft,
  type SegmentDraft,
} from "./types";

const LEVELS: LessonFormValues["level"][] = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TYPES: LessonFormValues["type"][] = [
  "MINI_STORY",
  "GRADED_READER",
  "PODCAST",
  "NEWS",
  "IMPORTED",
];
const SOURCE_TYPES: LessonFormValues["sourceType"][] = [
  "IN_HOUSE",
  "LICENSED",
  "IMPORTED",
];

const inputClass =
  "w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900";
const labelClass =
  "mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300";

export function LessonForm({
  lessonId,
  initialValues,
}: {
  lessonId?: string;
  initialValues?: LessonFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<LessonFormValues>(initialValues ?? EMPTY_LESSON);
  const [tagsInput, setTagsInput] = useState(initialValues?.topicTags.join(", ") ?? "");
  const [uploading, setUploading] = useState<"audio" | "cover" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createLesson = api.lesson.create.useMutation({
    onSuccess: () => router.push("/admin/lessons"),
    onError: (err) => setError(err.message),
  });
  const updateLesson = api.lesson.update.useMutation({
    onSuccess: () => router.push("/admin/lessons"),
    onError: (err) => setError(err.message),
  });

  const isSaving = createLesson.isPending || updateLesson.isPending;

  function set<K extends keyof LessonFormValues>(key: K, value: LessonFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function addSegment() {
    const next: SegmentDraft = { order: values.segments.length, text: "" };
    set("segments", [...values.segments, next]);
  }
  function updateSegment(index: number, patch: Partial<SegmentDraft>) {
    set(
      "segments",
      values.segments.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }
  function removeSegment(index: number) {
    set(
      "segments",
      values.segments.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })),
    );
  }

  function addQuestion() {
    const next: QuestionDraft = {
      order: values.questions.length,
      prompt: "",
      choices: ["", ""],
      correctIndex: 0,
    };
    set("questions", [...values.questions, next]);
  }
  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    set(
      "questions",
      values.questions.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }
  function removeQuestion(index: number) {
    set(
      "questions",
      values.questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i })),
    );
  }

  async function handleUpload(kind: "audio" | "cover", file: File) {
    setUploading(kind);
    setError(null);
    try {
      const url = await uploadFile(kind, file);
      set(kind === "audio" ? "audioUrl" : "coverImageUrl", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const topicTags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = { ...values, topicTags };

    if (lessonId) {
      updateLesson.mutate({ id: lessonId, ...payload });
    } else {
      createLesson.mutate(payload);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      {error && (
        <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="title">
          Title
        </label>
        <input
          id="title"
          className={inputClass}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="level">
            Level
          </label>
          <select
            id="level"
            className={inputClass}
            value={values.level}
            onChange={(e) => set("level", e.target.value as LessonFormValues["level"])}
          >
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="type">
            Type
          </label>
          <select
            id="type"
            className={inputClass}
            value={values.type}
            onChange={(e) => set("type", e.target.value as LessonFormValues["type"])}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="sourceType">
            Source
          </label>
          <select
            id="sourceType"
            className={inputClass}
            value={values.sourceType}
            onChange={(e) =>
              set("sourceType", e.target.value as LessonFormValues["sourceType"])
            }
          >
            {SOURCE_TYPES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ").toLowerCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="tags">
          Topic tags (comma-separated)
        </label>
        <input
          id="tags"
          className={inputClass}
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="animals, daily-life"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="bodyText">
          French text
        </label>
        <textarea
          id="bodyText"
          className={inputClass}
          rows={4}
          value={values.bodyText}
          onChange={(e) => set("bodyText", e.target.value)}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="translation">
          English translation (optional, used for A1 bilingual scaffolding)
        </label>
        <textarea
          id="translation"
          className={inputClass}
          rows={4}
          value={values.translation}
          onChange={(e) => set("translation", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Audio</label>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) =>
              e.target.files?.[0] && handleUpload("audio", e.target.files[0])
            }
          />
          {uploading === "audio" && (
            <p className="mt-1 text-xs text-neutral-500">Uploading…</p>
          )}
          {values.audioUrl && (
            <p className="mt-1 truncate text-xs text-neutral-500">{values.audioUrl}</p>
          )}
          {!values.audioUrl && (
            <p className="mt-1 text-xs text-amber-600">
              No recording yet — narration is still pending (see TASKS.md M1).
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Cover image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              e.target.files?.[0] && handleUpload("cover", e.target.files[0])
            }
          />
          {uploading === "cover" && (
            <p className="mt-1 text-xs text-neutral-500">Uploading…</p>
          )}
          {values.coverImageUrl && (
            <p className="mt-1 truncate text-xs text-neutral-500">
              {values.coverImageUrl}
            </p>
          )}
        </div>
      </div>

      <fieldset className="rounded border border-neutral-300 p-4 dark:border-neutral-700">
        <legend className="px-1 text-sm font-medium">Transcript segments</legend>
        <p className="mb-3 text-xs text-neutral-500">
          One row per sentence, in reading order. Leave start/end blank until real audio
          timing exists.
        </p>
        <div className="flex flex-col gap-2">
          {values.segments.map((segment, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-5 text-xs text-neutral-400">{i + 1}</span>
              <input
                className={inputClass}
                placeholder="Sentence text"
                value={segment.text}
                onChange={(e) => updateSegment(i, { text: e.target.value })}
              />
              <input
                className={`${inputClass} w-24`}
                type="number"
                placeholder="start ms"
                value={segment.startMs ?? ""}
                onChange={(e) =>
                  updateSegment(i, {
                    startMs: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <input
                className={`${inputClass} w-24`}
                type="number"
                placeholder="end ms"
                value={segment.endMs ?? ""}
                onChange={(e) =>
                  updateSegment(i, {
                    endMs: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />
              <button
                type="button"
                onClick={() => removeSegment(i)}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addSegment}
          className="mt-3 text-sm font-medium text-blue-600 hover:underline"
        >
          + Add segment
        </button>
      </fieldset>

      <fieldset className="rounded border border-neutral-300 p-4 dark:border-neutral-700">
        <legend className="px-1 text-sm font-medium">Comprehension questions</legend>
        <div className="flex flex-col gap-4">
          {values.questions.map((question, qi) => (
            <div key={qi} className="rounded bg-neutral-50 p-3 dark:bg-neutral-900">
              <div className="flex items-center gap-2">
                <input
                  className={inputClass}
                  placeholder="Question prompt"
                  value={question.prompt}
                  onChange={(e) => updateQuestion(qi, { prompt: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeQuestion(qi)}
                  className="shrink-0 text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
              <div className="mt-2 flex flex-col gap-1">
                {question.choices.map((choice, ci) => (
                  <div key={ci} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${qi}`}
                      checked={question.correctIndex === ci}
                      onChange={() => updateQuestion(qi, { correctIndex: ci })}
                      title="Correct answer"
                    />
                    <input
                      className={inputClass}
                      placeholder={`Choice ${ci + 1}`}
                      value={choice}
                      onChange={(e) =>
                        updateQuestion(qi, {
                          choices: question.choices.map((c, i) =>
                            i === ci ? e.target.value : c,
                          ),
                        })
                      }
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    updateQuestion(qi, { choices: [...question.choices, ""] })
                  }
                  className="self-start text-xs font-medium text-blue-600 hover:underline"
                >
                  + Add choice
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addQuestion}
          className="mt-3 text-sm font-medium text-blue-600 hover:underline"
        >
          + Add question
        </button>
      </fieldset>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSaving || uploading !== null}
          className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          {isSaving ? "Saving…" : lessonId ? "Save changes" : "Create lesson"}
        </button>
      </div>
    </form>
  );
}
