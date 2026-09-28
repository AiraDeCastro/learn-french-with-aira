"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function Nav() {
  const { data: session, status } = useSession();

  return (
    <nav className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 text-sm dark:border-neutral-800">
      <div className="flex items-center gap-5">
        <Link
          href="/"
          className="font-heading bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-lg font-semibold text-transparent dark:from-violet-300 dark:to-fuchsia-300"
        >
          Aira
        </Link>
        <Link
          href="/library"
          className="text-neutral-500 transition-colors hover:text-fuchsia-600 dark:text-neutral-400 dark:hover:text-fuchsia-400"
        >
          Library
        </Link>
        <Link
          href="/dashboard"
          className="text-neutral-500 transition-colors hover:text-fuchsia-600 dark:text-neutral-400 dark:hover:text-fuchsia-400"
        >
          Progress
        </Link>
        <Link
          href="/import"
          className="text-neutral-500 transition-colors hover:text-fuchsia-600 dark:text-neutral-400 dark:hover:text-fuchsia-400"
        >
          Import
        </Link>
      </div>
      <div>
        {status === "authenticated" && session.user ? (
          <button
            type="button"
            onClick={() => signOut()}
            className="text-neutral-500 transition-colors hover:text-fuchsia-600 dark:text-neutral-400 dark:hover:text-fuchsia-400"
          >
            Sign out ({session.user.email})
          </button>
        ) : (
          <Link
            href="/signin"
            className="text-neutral-500 transition-colors hover:text-fuchsia-600 dark:text-neutral-400 dark:hover:text-fuchsia-400"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
