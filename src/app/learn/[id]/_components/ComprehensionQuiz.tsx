"use client";

import { useState } from "react";

type Question = {
  id: string;
  prompt: string;
  choices: string[];
};

export function ComprehensionQuiz({
  questions,
  onSubmit,
  disabled,
}: {
  questions: Question[];
  onSubmit: (answers: number[]) => void;
  disabled: boolean;
}) {
  const [answers, setAnswers] = useState<(number | null)[]>(questions.map(() => null));

  const allAnswered = answers.every((a) => a !== null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(answers.map((a) => a ?? -1));
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
                name={`question-${question.id}`}
                checked={answers[qi] === ci}
                onChange={() =>
                  setAnswers((prev) => prev.map((a, i) => (i === qi ? ci : a)))
                }
              />
              {choice}
            </label>
          ))}
        </fieldset>
      ))}
      <button
        type="submit"
        disabled={!allAnswered || disabled}
        className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
      >
        Finish lesson
      </button>
    </form>
  );
}
