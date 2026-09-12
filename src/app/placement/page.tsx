"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

export default function PlacementPage() {
  const router = useRouter();
  const { data: questions, isLoading } = api.placement.getQuestions.useQuery();
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [started, setStarted] = useState(false);

  const submit = api.placement.submit.useMutation({
    onSuccess: () => router.push("/dashboard"),
  });

  if (isLoading || !questions) {
    return <div className="p-8 text-sm text-neutral-500">Loading…</div>;
  }

  if (!started) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
        <header>
          <h1 className="text-2xl font-semibold">Where should we start?</h1>
          <p className="mt-2 text-sm text-neutral-500">
            This only sorts beginners for now — our library is A1 so far, so it can&apos;t
            place you higher than that yet.
          </p>
        </header>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => submit.mutate({ startingFromZero: true })}
            disabled={submit.isPending}
            className="rounded border border-neutral-300 px-4 py-3 text-left text-sm dark:border-neutral-700"
          >
            <span className="font-medium">I&apos;m starting from zero</span>
            <span className="mt-1 block text-neutral-500">
              I don&apos;t know any French yet.
            </span>
          </button>
          <button
            type="button"
            onClick={() => setStarted(true)}
            className="rounded border border-neutral-300 px-4 py-3 text-left text-sm dark:border-neutral-700"
          >
            <span className="font-medium">Test my level</span>
            <span className="mt-1 block text-neutral-500">
              I know a little French already.
            </span>
          </button>
        </div>
      </div>
    );
  }

  const answered =
    answers.length === questions.length && answers.every((a) => a !== null);

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Quick check</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate({ answers: answers.map((a) => a ?? -1) });
        }}
        className="flex flex-col gap-6"
      >
        {questions.map((question, qi) => (
          <fieldset key={question.id} className="flex flex-col gap-2">
            <legend className="font-medium">{question.prompt}</legend>
            {question.choices.map((choice, ci) => (
              <label key={ci} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={question.id}
                  checked={answers[qi] === ci}
                  onChange={() =>
                    setAnswers((prev) => {
                      const next = [...prev];
                      next[qi] = ci;
                      return next;
                    })
                  }
                />
                {choice}
              </label>
            ))}
          </fieldset>
        ))}
        <button
          type="submit"
          disabled={!answered || submit.isPending}
          className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          See my result
        </button>
      </form>
    </div>
  );
}
