import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";

/**
 * Providers only activate once their real credentials are supplied via env
 * vars (see .env.example) — until then the sign-in page just has nothing to
 * show, which is the correct pre-configuration state, not a bug. Google is
 * the social provider; Resend sends a passwordless magic-link email, so
 * together they cover the "email + at least one social provider" MVP
 * requirement (PLANNING.md §3) without a password to store or leak.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET ? [Google] : []),
    ...(process.env.AUTH_RESEND_KEY
      ? [Resend({ from: process.env.AUTH_EMAIL_FROM ?? "onboarding@resend.dev" })]
      : []),
  ],
});
