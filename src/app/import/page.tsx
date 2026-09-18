"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/trpc/react";

/** Mirrors src/server/level-estimate.ts's LEVEL_ORDER — this page can't import that (server-only) file into client code. */
const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const IMPORTABLE_LEVELS = ["B2", "C1", "C2"] as const;

export default function ImportPage() {
  const router = useRouter();
  const { data: dashboard, isLoading } = api.progress.getDashboard.useQuery();
  const [url, setUrl] = useState("");
  const [level, setLevel] = useState<(typeof IMPORTABLE_LEVELS)[number]>("B2");
  const importMutation = api.import.fromUrl.useMutation({
    onSuccess: (lesson) => router.push(`/learn/${lesson.id}`),
  });

  if (isLoading) {
    return (
      <div className="p-8 text-sm text-neutral-500 dark:text-neutral-400">Loading…</div>
    );
  }

  const currentLevel = dashboard?.levelEstimate?.level ?? "A1";
  const unlocked = LEVEL_ORDER.indexOf(currentLevel) >= LEVEL_ORDER.indexOf("B2");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Bring your own content</h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          Paste in a link to a French article and turn it into a lesson — just for you,
          not added to the shared library.
        </p>
      </header>

      {!unlocked && (
        <p className="rounded border border-neutral-300 bg-neutral-50 p-4 text-sm text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400">
          Importing your own content unlocks once you reach B2 — you&apos;re currently at{" "}
          {currentLevel}. Keep going!
        </p>
      )}

      {unlocked && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            importMutation.mutate({ url, level });
          }}
          className="flex flex-col gap-4"
        >
          <div>
            <label htmlFor="importUrl" className="mb-1 block text-sm font-medium">
              Article link
            </label>
            <input
              id="importUrl"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.lemonde.fr/..."
              className="w-full rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              Article links only for now — video and podcast import needs a transcription
              step we haven&apos;t built yet.
            </p>
          </div>
          <div>
            <label htmlFor="importLevel" className="mb-1 block text-sm font-medium">
              Level
            </label>
            <select
              id="importLevel"
              value={level}
              onChange={(e) =>
                setLevel(e.target.value as (typeof IMPORTABLE_LEVELS)[number])
              }
              className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            >
              {IMPORTABLE_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={importMutation.isPending}
            className="self-start rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-neutral-100 dark:text-neutral-900"
          >
            {importMutation.isPending ? "Importing…" : "Import"}
          </button>
          {importMutation.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {importMutation.error.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
