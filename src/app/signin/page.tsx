"use client";

import { useEffect, useState } from "react";
import { getProviders, signIn } from "next-auth/react";

type Providers = Awaited<ReturnType<typeof getProviders>>;

export default function SignInPage() {
  const [providers, setProviders] = useState<Providers>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  const providerList = providers ? Object.values(providers) : [];

  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      {providers === null && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Loading…</p>
      )}

      {providers !== null && providerList.length === 0 && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          Sign-in isn&apos;t configured yet — Google and email credentials haven&apos;t
          been added (see .env.example). Progress is still saved locally in the meantime.
        </p>
      )}

      <div className="flex w-full flex-col gap-3">
        {providerList.map((provider) =>
          provider.type === "email" ? (
            <form
              key={provider.id}
              onSubmit={(e) => {
                e.preventDefault();
                signIn(provider.id, { email, callbackUrl: "/" });
              }}
              className="flex flex-col gap-2 text-left"
            >
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded border border-neutral-300 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                placeholder="you@example.com"
              />
              <button
                type="submit"
                className="rounded bg-neutral-900 px-4 py-2 text-sm font-medium text-white dark:bg-neutral-100 dark:text-neutral-900"
              >
                Send me a sign-in link
              </button>
            </form>
          ) : (
            <button
              key={provider.id}
              type="button"
              onClick={() => signIn(provider.id, { callbackUrl: "/" })}
              className="rounded border border-neutral-300 px-4 py-2.5 text-sm font-medium dark:border-neutral-700"
            >
              Continue with {provider.name}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
