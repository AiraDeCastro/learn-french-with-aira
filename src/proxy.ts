import { NextResponse, type NextRequest } from "next/server";
import { isValidAdminAuth } from "@/server/admin-auth";

/**
 * tRPC multiplexes every procedure through one route (`/api/trpc/[trpc]`),
 * so there's no admin-only *path* to gate the way `/admin/*` pages have —
 * instead, match on the procedure name(s) in the URL. `lesson.getById` is
 * included here too, not just the mutations: it's the one query that
 * includes `ComprehensionQuestion.correctIndex` (the reader deliberately
 * uses `lesson.getForReader` instead, see that procedure's doc comment) —
 * left open, it would leak every quiz's answer key to anyone who found the
 * URL, admin UI or not.
 *
 * This relies on the browser's own Basic Auth credential caching: once a
 * learner's — sorry, once Aira's — browser successfully authenticates
 * against `/admin`, it automatically attaches the same `Authorization`
 * header to same-origin fetch/XHR calls too, which is what lets the admin
 * form's own tRPC calls pass this gate without any separate client-side
 * auth code.
 */
const ADMIN_TRPC_PROCEDURES = [
  "lesson.create",
  "lesson.update",
  "lesson.delete",
  "lesson.getById",
];

function needsAdminAuth(pathname: string): boolean {
  if (pathname.startsWith("/admin")) return true;
  if (pathname.startsWith("/api/admin")) return true;
  if (pathname.startsWith("/api/trpc/")) {
    return ADMIN_TRPC_PROCEDURES.some((procedure) => pathname.includes(procedure));
  }
  return false;
}

const UNAUTHORIZED_RESPONSE_INIT = {
  status: 401,
  headers: { "WWW-Authenticate": 'Basic realm="Admin"' },
};

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!needsAdminAuth(pathname)) return NextResponse.next();

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    // Fail closed on Vercel (production *and* preview — both are public
    // URLs) if nobody's set a password yet, rather than silently leaving
    // admin wide open the way it was before this file existed. Stays open
    // locally so solo dev work needs no extra setup, matching how the rest
    // of this project treats missing local credentials (see .env.example).
    if (process.env.VERCEL === "1") {
      return new NextResponse("Admin access is not configured.", { status: 503 });
    }
    return NextResponse.next();
  }

  if (!isValidAdminAuth(req.headers.get("authorization"), adminPassword)) {
    return new NextResponse("Authentication required.", UNAUTHORIZED_RESPONSE_INIT);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/trpc/:path*"],
};
