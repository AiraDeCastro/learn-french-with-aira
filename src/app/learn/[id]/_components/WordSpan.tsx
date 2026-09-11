"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { enqueue } from "./offlineQueue";

function normalizeWord(raw: string): string {
  return raw.replace(/[.,!?;:"«»()]/g, "").toLowerCase();
}

/**
 * Tap-to-translate: a lookup popover that never navigates away from the
 * lesson (CLAUDE.md's "don't design against this" guardrail). Tapping a
 * word looks it up AND saves it as known — looking something up is the
 * signal that it's worth tracking, not a separate action.
 */
export function WordSpan({ raw, lessonId }: { raw: string; lessonId: string }) {
  const [open, setOpen] = useState(false);
  const word = normalizeWord(raw);
  const isWord = /\p{L}/u.test(word);

  const lookup = api.lexicon.lookup.useQuery(
    { word },
    { enabled: open && isWord, retry: 2 },
  );
  const saveWord = api.progress.saveWord.useMutation({
    onError: () => {
      enqueue({ type: "saveWord", payload: { word, lessonId }, queuedAt: Date.now() });
    },
  });

  if (!isWord) {
    return <span>{raw} </span>;
  }

  function handleClick() {
    setOpen((prev) => !prev);
    saveWord.mutate({ word, lessonId });
  }

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={handleClick}
        aria-expanded={open}
        className="-mx-0.5 rounded px-0.5 hover:bg-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-amber-900/40"
      >
        {raw}
      </button>{" "}
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-10 mt-1 block min-w-32 rounded border border-neutral-300 bg-white px-2 py-1 text-sm whitespace-nowrap text-neutral-900 shadow-lg dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
        >
          {lookup.isLoading && "…"}
          {lookup.isError && "Couldn't look this up — check your connection"}
          {!lookup.isLoading &&
            !lookup.isError &&
            (lookup.data?.definition ?? "No definition yet")}
        </span>
      )}
    </span>
  );
}
