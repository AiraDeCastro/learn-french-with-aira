"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * A standalone, informal DELF/DALF-aligned self-check (PRD §12: level
 * estimates are directional, not certified) — separate from the real
 * placement quiz and level estimate on purpose. Placement feeds real
 * mechanics (recommendations, the reader's B1+/B2+ gates), so it has to
 * stay honest about what content actually exists; this is just a "roughly
 * how would I place" curiosity check with no consequences, so it's scored
 * entirely client-side rather than round-tripping through the server —
 * there's no answer key worth protecting here, unlike a real comprehension
 * check (see lesson.getForReader's doc comment for that contrast).
 */
const QUESTIONS = [
  {
    level: "A1",
    prompt: "Que veut dire « merci » ?",
    choices: ["Thank you", "Please", "Goodbye"],
    correctIndex: 0,
  },
  {
    level: "A2",
    prompt: "« Elle va au marché tous les matins. » Que fait-elle chaque matin ?",
    choices: ["She goes to the market", "She stays home", "She goes to work"],
    correctIndex: 0,
  },
  {
    level: "B1",
    prompt:
      "« Bien qu'il pleuve, nous sortons quand même. » Que font-ils malgré la pluie ?",
    choices: [
      "Ils attendent que la pluie s'arrête",
      "Ils sortent quand même",
      "Ils restent à la maison",
    ],
    correctIndex: 1,
  },
  {
    level: "B2",
    prompt:
      "« Non seulement elle est intelligente, mais elle est aussi très généreuse. » Que dit cette phrase d'elle ?",
    choices: [
      "Elle est intelligente OU généreuse",
      "Elle n'est ni intelligente ni généreuse",
      "Elle est à la fois intelligente ET généreuse",
    ],
    correctIndex: 2,
  },
  {
    level: "B2/C1",
    prompt: "« Il est essentiel que vous soyez à l'heure. » Qu'exprime cette phrase ?",
    choices: [
      "Une simple suggestion",
      "Une obligation importante",
      "Une possibilité lointaine",
    ],
    correctIndex: 1,
  },
  {
    level: "C1",
    prompt:
      "« Quoi qu'on en dise, ses arguments, aussi convaincants soient-ils, ne suffisent pas à emporter l'adhésion. » Quel est le sens général de cette phrase ?",
    choices: [
      "Ses arguments sont faibles et personne ne les trouve convaincants",
      "Malgré des arguments convaincants, ils ne persuadent pas tout le monde",
      "Tout le monde est d'accord avec ses arguments",
    ],
    correctIndex: 1,
  },
] as const;

type Band = { range: [number, number]; level: string; description: string };
const BANDS: Band[] = [
  { range: [0, 1], level: "A1–A2", description: "Beginner — just starting out" },
  { range: [2, 3], level: "B1", description: "Intermediate — everyday conversation" },
  { range: [4, 5], level: "B2–C1", description: "Upper intermediate to advanced" },
  { range: [6, 6], level: "C1–C2", description: "Advanced to native-level" },
];

function bandFor(correctCount: number): Band {
  return BANDS.find((b) => correctCount >= b.range[0] && correctCount <= b.range[1])!;
}

export default function LevelCheckPage() {
  const [answers, setAnswers] = useState<(number | null)[]>(QUESTIONS.map(() => null));
  const [submitted, setSubmitted] = useState(false);

  const allAnswered = answers.every((a) => a !== null);
  const correctCount = answers.reduce<number>(
    (count, a, i) => count + (a === QUESTIONS[i].correctIndex ? 1 : 0),
    0,
  );

  if (submitted) {
    const band = bandFor(correctCount);
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
        <header>
          <h1 className="text-2xl font-semibold">Your informal result</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            This is a rough, informal self-check aligned to DELF/DALF-style questions —
            not a certified score. Your real progress is tracked from actual reading and
            listening, on your{" "}
            <Link href="/dashboard" className="underline">
              dashboard
            </Link>
            .
          </p>
        </header>
        <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
          <p className="text-3xl font-semibold">{band.level}</p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            {band.description} · {correctCount} of {QUESTIONS.length} correct
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAnswers(QUESTIONS.map(() => null));
            setSubmitted(false);
          }}
          className="self-start rounded border border-neutral-300 px-4 py-2 text-sm dark:border-neutral-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Informal level check</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          A quick, informal DELF/DALF-style check — questions get harder as you go. This
          doesn&apos;t change your real level estimate or your recommendations, it&apos;s
          just for your own curiosity.
        </p>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
        }}
        className="flex flex-col gap-6"
      >
        {QUESTIONS.map((question, qi) => (
          <fieldset key={qi} className="flex flex-col gap-2">
            <legend className="font-medium">{question.prompt}</legend>
            {question.choices.map((choice, ci) => (
              <label key={ci} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name={`question-${qi}`}
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
          disabled={!allAnswered}
          className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
        >
          See my result
        </button>
      </form>
    </div>
  );
}
