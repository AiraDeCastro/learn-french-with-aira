"use client";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export function Nav() {
  const { data: session, status } = useSession();

  return (
    <nav className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 text-sm dark:border-neutral-800">
      <div className="flex gap-4">
        <Link href="/" className="font-semibold">
          Aira
        </Link>
        <Link
          href="/library"
          className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Library
        </Link>
        <Link
          href="/dashboard"
          className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
        >
          Progress
        </Link>
      </div>
      <div>
        {status === "authenticated" && session.user ? (
          <button
            type="button"
            onClick={() => signOut()}
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Sign out ({session.user.email})
          </button>
        ) : (
          <Link
            href="/signin"
            className="text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Sign in
          </Link>
        )}
      </div>
    </nav>
  );
}
