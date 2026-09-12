# Learn French with Aira

A comprehensible-input French learning web app: leveled content (CEFR A1–C2) plus daily streaks, taking a learner from zero French to native-level ("Pro").

Full spec: [docs/PRD.md](docs/PRD.md) — read it before making product decisions this file doesn't cover.
Architecture, stack, and tooling: [docs/PLANNING.md](docs/PLANNING.md).
Milestone checklist: [docs/TASKS.md](docs/TASKS.md).

## Session workflow — do this every time

- **Start of every conversation:** read [docs/PLANNING.md](docs/PLANNING.md) for architecture/stack context.
- **Before starting any work:** check [docs/TASKS.md](docs/TASKS.md) to see what milestone is in progress and what's already done — don't re-plan from scratch.
- **The moment a task is done:** check it off in [docs/TASKS.md](docs/TASKS.md) — don't batch this for later.
- **Whenever a new task is discovered** (a gap, a follow-up, a missed piece of scope): add it to [docs/TASKS.md](docs/TASKS.md) under the right milestone as it's found, not after the fact.
- **The user (Aira) is not a technical reader.** After finishing a milestone (or a meaningful chunk of one), explain what was done in plain language — what it means for the app, not implementation detail — organized per milestone, not as a wall of file names.
- **Pause between milestones.** After wrapping up the milestone currently in progress, stop and wait for Aira to explicitly say to start the next one. Don't roll from one milestone into the next automatically.

## Commit workflow

- **Every commit is gated by Husky.** `.husky/pre-commit` runs `npm run verify` (format check → lint → dependency-tree check → security-audit check → generate Prisma client → push schema → seed → typecheck → unit tests → full production build) and refuses the commit if anything fails. `.husky/commit-msg` runs commitlint and refuses a commit message that isn't [Conventional Commits](https://www.conventionalcommits.org/) format.
- **`db:generate` must run before `typecheck` in both `verify` and CI — don't reorder this.** `src/generated/prisma` is gitignored, so a fresh checkout has no Prisma client on disk until it's generated; typecheck fails immediately without it (`Cannot find module '@/generated/prisma/client'`). This actually broke CI once (a leftover locally-generated client masked the bug until a real fresh-checkout run caught it) — see the 2026-09-09 M1 session summary entry below.
- **Write commit messages as `<type>(<scope>): <subject>`** — e.g. `feat(reader): add tap-to-translate`, `fix(streak): correct timezone bug`, `chore(deps): bump prisma`. Standard types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- **If a change has no test covering it, write the test first**, then the change — don't commit code the pre-commit gate can't actually exercise.
- **`npm audit` is gated through `scripts/check-audit.mjs`, not called directly.** It fails on any high/critical vulnerability that isn't on the file's reviewed allowlist (currently: advisories inside Prisma CLI's own MySQL-introspection dev tooling, which this Postgres-only project never touches). A genuinely new vulnerability still blocks the commit. Don't "fix" a failing audit by raising the severity threshold or deleting the check — either resolve it for real or add a dated, reasoned entry to the allowlist.
- **The full gate is slow on purpose** (a production build runs on every commit) — that's the tradeoff Aira asked for in exchange for never pushing a broken build. Don't work around it with `--no-verify` unless Aira explicitly says to.
- **The local Prisma dev database must be running for a commit to succeed.** Since M1, `npm run verify` pushes the schema, seeds data, and runs integration tests against a real database (`ctx.db` in tRPC tests) rather than mocking it — run `npm run db:dev` in a separate terminal first. Real-DB integration tests were a deliberate choice for the lesson/lexicon routers (mocking Prisma would mean the tests couldn't catch a bad schema or a broken query) — keep doing this for new routers unless there's a specific reason not to.
- **Don't assume the dev database is healthy just because `npx prisma dev ls` says `running`.** It has both stopped outright _and_ gone flaky-while-reportedly-running (`Connection terminated unexpectedly` / `ConnectionClosed` mid test-run, `ls` still says running) more than once in this environment — background processes here don't reliably persist or stay healthy across tool calls. Nothing is lost when the gate fails; git aborts the commit cleanly, so just fix and retry. If a commit fails with `ECONNREFUSED`, `ConnectionClosed`, or similar: don't bother with `npx prisma dev start aira-dev` (it has failed to actually revive a broken instance every time so far, even when it reports success) — go straight to tearing it down and rebuilding: `npx prisma dev rm aira-dev --force`, then `npx prisma dev --detach --name aira-dev`, then `prisma db push` + `npm run db:seed`, then re-run `npm run test` once standalone to confirm it's actually healthy _before_ retrying the commit (this wipes local data, which is fine — it's disposable dev data).
- **Vitest runs test files sequentially (`fileParallelism: false` in `vitest.config.ts`), not in parallel.** These are integration tests sharing one local Postgres connection pool; running files concurrently corrupted Postgres's unnamed prepared-statement protocol across files. Don't re-enable parallelism without solving that first.
- **Never import `@/auth` (next-auth) at the top of a router file, or anything a router file statically imports.** `next-auth` requires the real Next.js runtime and breaks module resolution under Vitest — even just importing it (without calling it) is enough to break every test that imports `appRouter`. The session resolves `userId` once in `createTRPCContext()` (`src/server/api/trpc.ts`), which itself lazily `await import()`s `@/auth` inside `src/server/current-user.ts` rather than importing it statically. Procedures read `ctx.userId`; they never call `getCurrentUserId()` or touch `@/auth` directly. Tests construct their own `{ db, userId }` context and never go near any of this.

## Project status

M0 (Project Foundations) is done except account-provisioning (hosted Postgres, Cloudflare R2, Vercel, Sentry, PostHog) that only Aira can do. M1 (Content Model & Admin Panel), M2 (Reader/Player Core), and M3 (Progress, Streaks & Levels) are all done — see [docs/TASKS.md](docs/TASKS.md) for the exact checklist. The learner-facing reader now works end-to-end at `/learn/[id]`: synced text, tap-to-translate with real word-saving, a comprehension check that records completions and now also updates a real streak/level, and offline-tolerant queueing — plus a progress dashboard (`/dashboard`) and a placement quiz (`/placement`, scoped to A1/A2 only since that's all the library has). All tested live in-browser against the real local database, not just code-reviewed.

Three things are genuinely blocked, not just deferred: **real audio narration** (needs an actual human voice — mini-stories are written and seeded, but `audioUrl` stays null until someone records them, which also means the reader's audio-sync highlighting is implemented but unverified against real audio), **admin access control** (`/admin/*` and `/api/admin/upload` have zero auth right now — fine for solo local work, not fine to deploy anywhere public), and **real sign-in** (progress — known words, lesson completions — is currently attributed to a single seeded local-dev user; see the `current-user.ts` note below).

`AGENTS.md` at the repo root is Next.js's own framework-conventions file, regenerated by `next dev` — read it for Next.js-specific API/convention rules; it's separate from this file's project-specific guidance. `.agents/skills/` and `.windsurf/skills/` were added automatically by `prisma init` — official Prisma reference docs for AI coding agents; consult them (especially `prisma-cli` and `prisma-client-api`) before writing Prisma-related code.

## Session summary

**2026-09-08 — Planning + M0 (project foundations)**

- Wrote the PRD ([docs/PRD.md](docs/PRD.md)), covering the comprehensible-input method, the A1–C2 ("Pro") level framework, MVP/V2 features, streak mechanics, and success metrics.
- Created the GitHub repo ([AiraDeCastro/learn-french-with-aira](https://github.com/AiraDeCastro/learn-french-with-aira), public) and pushed the PRD.
- Wrote this file (CLAUDE.md) and [docs/PLANNING.md](docs/PLANNING.md) (architecture + tech stack), then confirmed the MVP stack with Aira (Next.js/TypeScript, tRPC, PostgreSQL+Prisma, Cloudflare R2, Auth.js, Vercel — full reasoning in PLANNING.md §3).
- Wrote [docs/TASKS.md](docs/TASKS.md): 8 milestones (M0–M7) breaking the PRD's three build phases into concrete tasks.
- Completed the code-only parts of M0: scaffolded the Next.js app; added ESLint/Prettier/strict TypeScript; scaffolded tRPC end to end (a `health.ping` procedure proves client → server → back works, covered by a Vitest test); installed Prisma and verified it against a local database (Prisma's built-in `prisma dev` — no Docker, no account needed for local work); scaffolded Auth.js with Google + Resend-email sign-in (inactive until real credentials are added); added a GitHub Actions CI workflow (lint, format check, typecheck, unit tests, build) that runs on every push/PR; set up Vitest and Playwright with passing smoke tests.
- Left unchecked, and blocked on Aira creating accounts: a hosted Postgres database (Neon/Supabase), a Cloudflare R2 bucket, a Vercel project, a Sentry project, and a PostHog project. Local development works without any of these.
- Discovered and logged one follow-up task: wire Playwright E2E into CI (currently local-only, to avoid a slow browser download on every push).

**2026-09-09 — Pre-commit standards + Conventional Commits**

- Added a Husky pre-commit gate: every commit now runs format check, lint, a dependency-tree check (`npm ls`), a security-audit check, typecheck, unit tests, and a full `next build` — see the Commit workflow section above.
- Wrote [scripts/check-audit.mjs](../scripts/check-audit.mjs): a small allowlist gate around `npm audit`, needed because npm's `--omit=dev` doesn't actually exclude devDependencies from the audit graph (a known npm limitation). Without it, the gate would permanently fail on 4 high-severity advisories that live entirely inside Prisma CLI's own bundled MySQL-introspection tooling (dev-only, unreachable — this project is Postgres-only), with no fix available short of downgrading Prisma two major versions. The script fails on anything high/critical that isn't explicitly allowlisted with a dated reason, so a real new vulnerability still blocks a commit.
- Added commitlint + a `.husky/commit-msg` hook enforcing Conventional Commits on every commit message.
- Added `.gitattributes` forcing LF line endings on `.husky/*` and `*.sh`, since Windows checkouts would otherwise convert them to CRLF and risk breaking the hook scripts.

**2026-09-09 — M1 (content model + admin panel)**

- Designed the full Prisma schema (`User`, `Lesson`, `TranscriptSegment`, `ComprehensionQuestion`, `LessonCompletion`, `KnownWord`, `Streak`, `LevelEstimate`, `LexiconEntry`) and pushed it to the local dev database.
- Prisma 7 turned out to require an explicit driver adapter (`@prisma/adapter-pg`) rather than reading `DATABASE_URL` implicitly — added it to `src/server/db.ts` and `prisma/seed.ts`. Discovered via the `prisma-client-api` skill Prisma's own `init` installed.
- Built `src/server/storage.ts`: local-disk file storage for lesson audio/cover art, standing in for Cloudflare R2 until that account exists. Callers only ever see `saveUpload()` and an `/api/media/...` URL, never a filesystem path, so swapping the backend later shouldn't touch call sites.
- Built the admin panel (`/admin/lessons` list, new/edit forms) on tRPC's `lesson` router — create, edit, and file upload all tested working end-to-end in the browser against the real local database. **No auth in front of it yet** — logged as a follow-up in TASKS.md.
- Wrote and seeded 4 real A1 mini-stories (`prisma/seed.ts`) built from a shared ~70-word vocabulary, each with comprehension questions. Audio narration is left null — recording real audio needs an actual human voice, which isn't something a coding session can produce.
- Built the `lexicon` router (`lexicon.lookup`) backing tap-to-translate, seeded with 72 hand-curated, verified French↔English entries covering the mini-story vocabulary. Attempted to source a bulk-importable open dataset (FreeDict) first; its distributions are TEI XML / StarDict binary formats that need real parsing work, so that's logged as a follow-up rather than rushed.
- Wrote the `lesson`/`lexicon` router tests as integration tests hitting the real local database (`ctx.db` via `appRouter.createCaller`) rather than mocking Prisma — a deliberate choice, but it means `npm run verify` and CI now also run `db:push` + `db:seed` before tests, and CI gained a real Postgres service container.
- Shipped a broken step order in the first push of this work: `typecheck` ran before `db:generate` in both `verify` and CI, which only "passed" locally because a Prisma client generated during earlier manual testing was still sitting on disk. The next CI run (a genuinely fresh checkout) failed immediately on `Cannot find module '@/generated/prisma/client'`. Fixed by moving `db:generate`/`db:push`/`db:seed` before `typecheck` in both places, then confirmed by deleting `src/generated` locally and re-running `verify` clean.

**2026-09-10 — M2 (reader/player core)**

- Built the reader at `/learn/[id]` (`Reader.tsx` + `WordSpan.tsx` + `ComprehensionQuiz.tsx`): synced segment highlighting (logic in place, unverified against real audio since none exists yet), native playback controls plus a speed selector, tap-to-translate that both looks up and saves the word in one action, a comprehension check that scores answers and records `LessonCompletion`, an A-/A+ text-size control, and a translation toggle for A1's bilingual scaffolding. All tested live in the browser against the real local database — created a word-save, confirmed it in the database; completed a quiz, confirmed the completion row.
- Hit two real architecture problems building this, both now fixed and documented under "Commit workflow" above:
  1. Statically importing `@/auth` (next-auth) anywhere a router file touches broke every test under Vitest, because next-auth requires the real Next.js runtime — even an unused import was enough. Fixed by resolving `userId` once in `createTRPCContext()` and having `current-user.ts` lazily `await import("@/auth")` inside the function body, so router files and tests never load it. All four existing test files needed updating to pass `{ db, userId }` context directly instead of calling `createTRPCContext()`.
  2. Vitest's parallel test-file workers were corrupting Postgres's prepared-statement protocol (`bind message supplies N parameters, but prepared statement requires 0`) since all files share one local Postgres connection pool. Fixed with `fileParallelism: false`; confirmed stable across repeated runs.
- Added `src/server/current-user.ts`: resolves the real Auth.js session if one exists, otherwise falls back to a single seeded local-dev user — hard-disabled in production — so known-word/lesson-completion persistence could be built and tested for real now instead of stubbed out until M4's real sign-in lands.
- Built a real offline-tolerant queue (`_components/offlineQueue.ts`, localStorage-backed) for word-saves and lesson completions per PRD §11. Verified it for real: patched `window.fetch` in the live browser to fail tRPC calls, confirmed the action queued, restored the network and fired the `online` event, confirmed the queue flushed and the word landed in the database.
- Caught and fixed a real UX bug during that same offline test: the tap-to-translate popover showed "No definition yet" for both a genuinely-missing word and a failed lookup request, which would mislead a learner into thinking a real word wasn't in the dictionary. Now distinguishes loading / error / not-found.
- Logged two follow-ups rather than rushing them: a Playwright E2E test for the full reader flow, and swapping the local-dev-user fallback for the real session once M4 ships sign-in.

**2026-09-11 — M3 (progress, streaks & levels)**

- Added `User.timezone`, changed `Streak.lastActiveDate` from a `DateTime` to a plain `"YYYY-MM-DD"` string, and added `LessonCompletion.durationSeconds` — schema changes to support local-day streak math and an hours-of-input signal.
- Wrote `src/server/streak.ts`: pure date-math logic (calendar-day gap, freeze earned every 7 consecutive days, one freeze covers exactly one missed day, anything larger breaks the streak even with freezes banked) — kept separate from the database specifically so this, the trickiest part, could be unit-tested directly. 12 unit tests, all passing before it ever touched the router.
- Wrote `src/server/level-estimate.ts`: a first-pass, explicitly-directional heuristic (word count + "completed ≥2 lessons at a level comfortably") — 11 unit tests.
- Wired both into `progress.completeLesson`: every lesson completion now also updates a real streak (with freeze logic) and recomputes the level estimate, returned to the reader for a "🔥 N-day streak" / "🎉 one week in a row" banner. Added `progress.getDashboard` and a `/dashboard` page.
- Built `/placement`, a short quiz feeding `placement.submit`. **Deliberately scoped to only distinguish A1 from A2** — the library only has A1 content seeded, so claiming to place someone into B1+ would be assessing against content that doesn't exist. Logged extending it as a follow-up once higher-level content exists.
- Caught a real bug live in the browser, not just in review: completing the placement quiz set the level to A2, but the very next lesson completion silently recomputed it back down to A1, because the word-count/completion heuristic had no idea a placement quiz had ever run. Fixed by having `completeLesson` take the higher of (fresh heuristic result, existing estimate) — `maxLevel()` in `level-estimate.ts` — so an ordinary completion can only raise the estimate, never lower one already set; only a fresh placement-quiz attempt is allowed to lower it. Added both a unit test (`maxLevel`) and an integration test reproducing the exact scenario (placement → A2, then a low-signal completion, still A2) before considering it fixed.
- Hit the local dev database silently dying mid-session again (see "Commit workflow" above) — this time `prisma dev start` couldn't revive the existing instance (stale PID in its state file). Removed the broken instance (`prisma dev rm`) and created a fresh one, which resolved it. Worth knowing if this recurs: removing and recreating the named instance is the fix, not just `start`.
- Tested the full loop live: completed a lesson → streak showed 1 day, level A1; ran the placement quiz answering all three correctly → level correctly jumped to A2 and stayed there through a follow-up completion.

## Product method — don't design against this

The product's entire pedagogy is Krashen's **comprehensible input / i+1**: learners acquire French by reading and listening to material _slightly_ above their current level, not by drilling grammar or vocabulary out of context. Concretely:

- Content is not "correct/incorrect" graded exercises — it's leveled reading/listening material (stories, podcasts, news, native media) with lookup and comprehension support.
- Word lookup should never interrupt reading/listening flow (no modal dictionary detours) and should always **save the word** rather than just define it.
- Don't add flashcard/SRS drilling as a primary mechanic. Spaced review (V2) is a light, optional nudge back toward _re-encountering_ words in real content, not isolated drill.
- Reading and listening should be able to run in sync (text highlights with audio) wherever content has both.

## Domain vocabulary

| Term            | Meaning                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Level**       | CEFR scale A1–C2, matching French DELF/DALF exam levels. Every piece of content is tagged with one.                                              |
| **Pro**         | In-product branding for C2 — native-level, content chosen by interest not level.                                                                 |
| **i+1**         | Krashen's term for the target difficulty: just above the learner's current level.                                                                |
| **Known word**  | A word the learner has looked up or marked known; the running count is a core progress signal, tracked independently of "lessons completed."     |
| **Lesson**      | One unit of content (a mini-story, a podcast segment, a reading) with a comprehension check at the end. Completing one is what extends a streak. |
| **Streak**      | Consecutive calendar days (learner's local timezone) with at least one completed lesson. One freeze/week is earned to cover a missed day.        |
| **Mini-story**  | Short beginner (A1) content built from a small set of ~30–40 high-frequency words repeated across many scenes.                                   |
| **Import** (V2) | Learner-supplied content (article/video/podcast link) turned into an interactive lesson — B2+ only.                                              |

See [docs/PRD.md §6](docs/PRD.md#6-level-framework-a1--pro) for the full level → content-type mapping, and §5 for the method in more depth.

## Guardrails from the PRD

- **Non-goals (don't build unless asked):** live tutoring/conversation exchange, DELF/DALF certification as a first-class feature, native mobile apps, non-French languages.
- **Streak design:** the minimum unit that "counts" toward a streak must still deliver meaningful input — don't let it collapse into a trivial tap-through that games the streak without any exposure. See PRD §8 and the "streaks ≠ input" risk in §12.
- **Content rights:** library content must be licensed, public-domain, or produced in-house. Imported content (V2) is for the importing learner's personal study only — never redistributed to other learners.
- **Level estimates are directional**, not certified CEFR scores — don't present them to users as official.
- **Beginner cold-start:** A1 cannot be pure native input; it needs heavy scaffolding (bilingual text, transcripts, mini-stories) per the method itself. Don't simplify this away.

## Build order (per PRD §13)

1. **MVP:** A1–B1 content, synced reader/player, tap-to-translate + known-words tracker, streaks, progress dashboard, basic placement quiz.
2. **Phase 2:** B2–C1 content, bring-your-own-content import, interest-based recommendations, streak freeze/milestones.
3. **Phase 3 (Pro):** C2 native-media library, spaced word review, speaking-activation prompts.

Don't build Phase 2/3 features ahead of Phase 1 unless the user explicitly asks.
