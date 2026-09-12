"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/trpc/react";
import { WordSpan } from "./WordSpan";
import { ComprehensionQuiz } from "./ComprehensionQuiz";
import { enqueue, peekQueue, removeFromQueue } from "./offlineQueue";

type LessonData = {
  id: string;
  title: string;
  level: string;
  type: string;
  topicTags: string[];
  translation: string | null;
  audioUrl: string | null;
  segments: {
    id: string;
    order: number;
    text: string;
    startMs: number | null;
    endMs: number | null;
  }[];
  questions: { id: string; order: number; prompt: string; choices: string[] }[];
};

const FONT_SCALES = [1, 1.15, 1.3] as const;

type CompletionResult = {
  correctCount: number;
  total: number;
  streak?: {
    currentCount: number;
    freezeEarned: boolean;
    hitSevenDayMilestone: boolean;
  };
};

export function Reader({ lesson }: { lesson: LessonData }) {
  const [showTranslation, setShowTranslation] = useState(false);
  const [fontScaleIndex, setFontScaleIndex] = useState(0);
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);
  const [result, setResult] = useState<CompletionResult | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  const saveWordMutation = api.progress.saveWord.useMutation();
  const completeLessonMutation = api.progress.completeLesson.useMutation();

  const hasTimedSegments = lesson.segments.some(
    (s) => s.startMs != null && s.endMs != null,
  );

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !hasTimedSegments) return;

    function onTimeUpdate() {
      if (!audio) return;
      const ms = audio.currentTime * 1000;
      const active = lesson.segments.find(
        (s) => s.startMs != null && s.endMs != null && ms >= s.startMs && ms < s.endMs,
      );
      setActiveSegmentId(active?.id ?? null);
    }
    audio.addEventListener("timeupdate", onTimeUpdate);
    return () => audio.removeEventListener("timeupdate", onTimeUpdate);
  }, [lesson.segments, hasTimedSegments]);

  // Offline-queue flush: retry anything that failed to save (dropped
  // connection mid-lesson) on mount and whenever the browser comes back
  // online, rather than losing it (PRD §11).
  useEffect(() => {
    async function flush() {
      const queue = peekQueue();
      for (const action of queue) {
        try {
          if (action.type === "saveWord") {
            await saveWordMutation.mutateAsync(action.payload);
          } else {
            await completeLessonMutation.mutateAsync(action.payload);
          }
          removeFromQueue(action.queuedAt);
        } catch {
          break; // still offline — stop and try again next trigger
        }
      }
      setPendingCount(peekQueue().length);
    }
    flush();
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleQuizSubmit(answers: number[]) {
    const durationSeconds = Math.round(
      (Date.now() - (startedAtRef.current ?? Date.now())) / 1000,
    );
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    completeLessonMutation.mutate(
      { lessonId: lesson.id, answers, durationSeconds, timezone },
      {
        onSuccess: (data) => setResult(data),
        onError: () => {
          enqueue({
            type: "completeLesson",
            payload: { lessonId: lesson.id, answers, durationSeconds, timezone },
            queuedAt: Date.now(),
          });
          setPendingCount((c) => c + 1);
          // Optimistic: the learner still gets credit for finishing locally;
          // the real record lands once the queue flushes.
          setResult({ correctCount: -1, total: lesson.questions.length });
        },
      },
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header>
        <p className="text-xs tracking-wide text-neutral-500 uppercase">
          {lesson.level} · {lesson.type.replace("_", " ").toLowerCase()}
        </p>
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        {lesson.topicTags.length > 0 && (
          <p className="mt-1 text-sm text-neutral-500">{lesson.topicTags.join(", ")}</p>
        )}
      </header>

      {pendingCount > 0 && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          {pendingCount} update{pendingCount === 1 ? "" : "s"} will sync once you&apos;re
          back online.
        </p>
      )}

      {lesson.audioUrl && (
        <div className="flex flex-col gap-2">
          <audio ref={audioRef} controls src={lesson.audioUrl} className="w-full">
            Your browser does not support the audio element.
          </audio>
          <label className="flex items-center gap-2 text-sm text-neutral-500">
            Speed:
            <select
              defaultValue="1"
              onChange={(e) => {
                if (audioRef.current)
                  audioRef.current.playbackRate = Number(e.target.value);
              }}
              className="rounded border border-neutral-300 px-2 py-1 dark:border-neutral-700 dark:bg-neutral-900"
            >
              <option value="0.75">0.75×</option>
              <option value="1">1×</option>
              <option value="1.25">1.25×</option>
              <option value="1.5">1.5×</option>
            </select>
          </label>
        </div>
      )}
      {!lesson.audioUrl && (
        <p className="text-sm text-neutral-500 italic">
          No narration yet for this lesson — reading only.
        </p>
      )}

      <div className="flex items-center gap-3 text-sm">
        <span className="text-neutral-500">Text size:</span>
        <button
          type="button"
          onClick={() => setFontScaleIndex((i) => Math.max(0, i - 1))}
          disabled={fontScaleIndex === 0}
          aria-label="Decrease text size"
          className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700"
        >
          A-
        </button>
        <button
          type="button"
          onClick={() =>
            setFontScaleIndex((i) => Math.min(FONT_SCALES.length - 1, i + 1))
          }
          disabled={fontScaleIndex === FONT_SCALES.length - 1}
          aria-label="Increase text size"
          className="rounded border border-neutral-300 px-2 py-1 disabled:opacity-40 dark:border-neutral-700"
        >
          A+
        </button>
        {lesson.translation && (
          <button
            type="button"
            onClick={() => setShowTranslation((v) => !v)}
            aria-pressed={showTranslation}
            className="ml-auto rounded border border-neutral-300 px-3 py-1 dark:border-neutral-700"
          >
            {showTranslation ? "Hide" : "Show"} translation
          </button>
        )}
      </div>

      <div
        className="flex flex-col gap-2 leading-relaxed"
        style={{ fontSize: `${FONT_SCALES[fontScaleIndex]}rem` }}
      >
        {lesson.segments.map((segment) => (
          <p
            key={segment.id}
            className={
              segment.id === activeSegmentId
                ? "rounded bg-amber-100 px-1 dark:bg-amber-900/40"
                : undefined
            }
          >
            {segment.text
              .split(/(\s+)/)
              .map((token, i) =>
                token.trim() === "" ? (
                  token
                ) : (
                  <WordSpan key={i} raw={token} lessonId={lesson.id} />
                ),
              )}
          </p>
        ))}
      </div>

      {showTranslation && lesson.translation && (
        <p className="rounded border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-400">
          {lesson.translation}
        </p>
      )}

      {lesson.questions.length > 0 && !result && (
        <section className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
          <h2 className="mb-4 font-semibold">Check your understanding</h2>
          <ComprehensionQuiz
            questions={lesson.questions}
            onSubmit={handleQuizSubmit}
            disabled={completeLessonMutation.isPending}
          />
        </section>
      )}

      {result && (
        <section className="rounded border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {result.correctCount === -1 ? (
            <p>
              Lesson finished — your answers will be scored once you&apos;re back online.
            </p>
          ) : (
            <>
              <p>
                Lesson complete! You got {result.correctCount} of {result.total} right.
              </p>
              {result.streak && (
                <p className="mt-2">
                  🔥 {result.streak.currentCount}-day streak
                  {result.streak.freezeEarned && " — you earned a streak freeze!"}
                </p>
              )}
              {result.streak?.hitSevenDayMilestone && (
                <p className="mt-2 font-medium">🎉 One week in a row — keep it up!</p>
              )}
              <a
                href="/dashboard"
                className="mt-3 inline-block text-sm font-medium underline"
              >
                View your progress
              </a>
            </>
          )}
        </section>
      )}
    </div>
  );
}
