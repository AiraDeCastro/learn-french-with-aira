"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

const GOALS = [
  {
    value: "travel",
    label: "Travel",
    hint: "I'm visiting or moving somewhere French-speaking.",
  },
  { value: "heritage", label: "Heritage", hint: "It's part of my family or culture." },
  { value: "work", label: "Work", hint: "I need it for my job." },
  {
    value: "media",
    label: "Media",
    hint: "I want to enjoy French books, shows, or music.",
  },
] as const;

const MAX_INTERESTS = 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"goal" | "interests">("goal");
  const [goal, setGoal] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);

  const { data: topics, isLoading: topicsLoading } = api.lesson.listTopics.useQuery(
    undefined,
    { enabled: step === "interests" },
  );

  const complete = api.onboarding.complete.useMutation({
    onSuccess: () => router.push("/placement"),
  });

  function toggleInterest(topic: string) {
    setInterests((prev) => {
      if (prev.includes(topic)) return prev.filter((t) => t !== topic);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, topic];
    });
  }

  if (step === "goal") {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
        <header>
          <h1 className="text-2xl font-semibold">Why are you learning French?</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            This just helps us pick content you&apos;ll actually want to read.
          </p>
        </header>
        <div className="flex flex-col gap-3">
          {GOALS.map((g) => (
            <button
              key={g.value}
              type="button"
              onClick={() => {
                setGoal(g.value);
                setStep("interests");
              }}
              className="rounded border border-neutral-300 px-4 py-3 text-left text-sm dark:border-neutral-700"
            >
              <span className="font-medium">{g.label}</span>
              <span className="mt-1 block text-neutral-500 dark:text-neutral-400">
                {g.hint}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">What are you interested in?</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Pick up to {MAX_INTERESTS} — we&apos;ll prioritize lessons that match.
        </p>
      </header>

      {topicsLoading && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      )}

      <div className="flex flex-wrap gap-2">
        {topics?.map((topic) => {
          const selected = interests.includes(topic);
          return (
            <button
              key={topic}
              type="button"
              onClick={() => toggleInterest(topic)}
              aria-pressed={selected}
              disabled={!selected && interests.length >= MAX_INTERESTS}
              className={
                selected
                  ? "rounded-full border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-sm text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
                  : "rounded-full border border-neutral-300 px-3 py-1.5 text-sm disabled:opacity-40 dark:border-neutral-700"
              }
            >
              {topic}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => goal && complete.mutate({ goal, interests })}
        disabled={complete.isPending}
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        {complete.isPending ? "Saving…" : "Continue"}
      </button>
    </div>
  );
}
