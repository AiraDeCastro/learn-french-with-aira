"use client";

import Link from "next/link";
import { api } from "@/trpc/react";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border border-neutral-200 p-4 dark:border-neutral-800">
      <p className="text-xs tracking-wide text-neutral-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      {sub && <p className="mt-1 text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = api.progress.getDashboard.useQuery();

  if (isLoading) return <div className="p-8 text-sm text-neutral-500">Loading…</div>;
  if (error || !data)
    return (
      <div className="p-8 text-sm text-red-600">Couldn&apos;t load your progress.</div>
    );

  const { streak, levelEstimate, knownWordCount, hoursOfInput } = data;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Your progress</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Level is a directional estimate, not a certified score.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Streak"
          value={`${streak.currentCount} day${streak.currentCount === 1 ? "" : "s"}`}
          sub={
            streak.freezeBalance > 0
              ? `${streak.freezeBalance} freeze${streak.freezeBalance === 1 ? "" : "s"} banked`
              : undefined
          }
        />
        <StatCard label="Level" value={levelEstimate?.level ?? "Not yet set"} />
        <StatCard label="Known words" value={String(knownWordCount)} />
        <StatCard label="Hours of input" value={hoursOfInput.toFixed(1)} />
      </div>

      {levelEstimate?.basis && (
        <p className="text-xs text-neutral-500">
          Level estimate based on: {levelEstimate.basis}
        </p>
      )}

      {!levelEstimate && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          You haven&apos;t taken the placement quiz yet.{" "}
          <Link href="/placement" className="underline">
            Take it now
          </Link>
          , or just start reading — your level updates automatically as you go.
        </p>
      )}

      <Link
        href="/admin/lessons"
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        Browse lessons →
      </Link>
    </div>
  );
}
