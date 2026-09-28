import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/server/db";

/**
 * Providers only activate once their real credentials are supplied via env
 * vars (see .env.example) — until then the sign-in page just has nothing to
 * show, which is the correct pre-configuration state, not a bug. Google is
 * the social provider; Resend sends a passwordless magic-link email, so
 * together they cover the "email + at least one social provider" MVP
 * requirement (PLANNING.md §3) without a password to store or leak.
 *
 * The adapter is required by Auth.js itself the moment Resend is active —
 * the Email/magic-link strategy has to persist a one-time verification
 * token somewhere between "email sent" and "link clicked" (Google alone
 * never needed this; it broke with `MissingAdapter` only once a real
 * AUTH_RESEND_KEY activated the Resend provider for the first time). Session
 * strategy is pinned to "jwt" explicitly: without this, an adapter's mere
 * presence switches NextAuth to database-backed sessions by default, which
 * would add a real write on every request instead of just verifying a
 * signed cookie. `getCurrentUserId()` (src/server/current-user.ts) still
 * does its own upsert-by-email against this app's `User` table — harmless
 * alongside the adapter's own user-creation, since both key off the same
 * unique `email` column and the second upsert is a no-op once one exists.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
    ...(process.env.AUTH_RESEND_KEY
      ? [Resend({ from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev" })]
      : []),
  ],
});
