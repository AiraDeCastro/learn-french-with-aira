# Learn French with Aira — Tasks

Working checklist derived from [PRD.md](PRD.md) (scope) and [PLANNING.md](PLANNING.md) (stack/architecture). Milestones M0–M5 deliver the MVP (PRD §13 Phase 1); M6–M7 map to PRD Phase 2/3. Work top to bottom — don't start a later milestone's tasks early unless blocked.

---

## M0 — Project Foundations

Scaffolding per [PLANNING.md §3](PLANNING.md#3-technology-stack); nothing product-specific yet.

- [x] Init Next.js + TypeScript project, with Tailwind CSS configured
- [x] Set up ESLint, Prettier, and TypeScript strict mode
- [ ] Provision Postgres (Neon or Supabase) and connect Prisma — **partially done:** Prisma is installed and confirmed working against a local database (`npm run db:dev`, no account needed); a hosted Neon/Supabase project for staging/production still needs to be created by hand — see [session summary in CLAUDE.md](../CLAUDE.md)
- [x] Set up tRPC router scaffolding (client + server)
- [ ] Configure Auth.js (email + at least one social provider) — **partially done:** Google + Resend magic-link sign-in are wired end-to-end in code; sign-in won't actually work until real Google OAuth and Resend credentials are added to `.env` (see `.env.example`)
- [ ] Provision Cloudflare R2 bucket for audio/transcripts/cover art — blocked on a Cloudflare account being created
- [ ] Connect Vercel project with preview deploys on PR — blocked on a Vercel account being created
- [x] Set up GitHub Actions: typecheck + lint + test on every PR
- [ ] Wire up Sentry error tracking — blocked on a Sentry account being created
- [ ] Wire up PostHog (EU-hosted) analytics — blocked on a PostHog account being created
- [x] Configure Vitest and Playwright test runners (empty smoke test passing)
- [ ] Add a Playwright E2E job to CI (currently E2E only runs locally via `npm run test:e2e` — CI only runs the fast unit tests, to avoid a slow browser download on every push)
- [x] Add a pre-commit gate (Husky): every commit runs format check, lint, dependency-tree check, a security-audit check, typecheck, unit tests, and a full production build — a commit is refused if any of these fail
- [x] Enforce Conventional Commits via commitlint on the commit-msg hook

## M1 — Content Model & Admin Panel

The library is the product (PLANNING.md §1) — content tooling comes before learner-facing UI.

- [x] Design Prisma schema: `User`, `Lesson`, `LessonCompletion`, `KnownWord`, `Streak`, `LevelEstimate` — also added `TranscriptSegment`, `ComprehensionQuestion`, and `LexiconEntry`, which the sketch in PLANNING.md didn't spell out but M1/M2 need concretely
- [x] Add `Lesson.level` (A1–C2), `Lesson.type` (mini-story / graded reader / podcast / news / imported), `Lesson.topicTags`
- [x] Add `Lesson.sourceType` (in-house / licensed / imported) per the content-rights requirement (PRD §11)
- [x] Build in-app admin panel: create/edit a lesson, set level + topic tags, upload audio + transcript, upload cover art — file uploads go to local disk for now (`src/server/storage.ts`), a stand-in for Cloudflare R2 until that account exists; **no access control yet, see follow-up below**
- [x] Build transcript-timing input in the admin panel (word/sentence timestamps, hand-entered or via forced-alignment output) — hand-entered rows in the admin form; a forced-alignment pipeline is a later addition once real audio exists
- [ ] Write and record the first A1 mini-story set (30–40 high-frequency words, per PRD §6) — **partially done:** wrote and seeded 4 real mini-stories (`prisma/seed.ts`) using a repeated ~70-word vocabulary, each with comprehension questions; **recording real audio narration is blocked** — it needs an actual human voice, which isn't something that can be produced in code (PLANNING.md §3 ruled out TTS for MVP quality reasons)
- [ ] Seed the self-hosted lexicon from an open dataset (Wiktionary/FreeDict extract) for word lookup — **partially done:** built the lookup infrastructure (`LexiconEntry` model + `lexicon.lookup` tRPC procedure) and seeded 72 hand-curated, verified entries covering the mini-story vocabulary; bulk-importing a full open dataset is still open — investigated FreeDict, its distributions are in formats (TEI XML / StarDict binary) that need a real parsing effort, not a quick fetch
- [ ] Add authentication/access control in front of `/admin/*` and the `/api/admin/upload` route before this is shown to anyone but Aira (discovered while building the admin panel — currently anyone with the URL can create/edit/delete lessons)

## M2 — Reader/Player Core

The core learner interaction (PLANNING.md §2.2).

- [ ] Build the synced text+audio reader: sentence highlights in time with playback
- [ ] Build playback controls (play/pause, scrub, speed) accessible via keyboard
- [ ] Build tap-to-translate: inline definition popover on any word, no navigation away from the lesson
- [ ] Wire word taps to save into `KnownWord` (first-seen/last-seen, source lesson)
- [ ] Add a comprehension check (few questions) at the end of each lesson
- [ ] Add local queueing for lesson progress and word-saves so a dropped connection mid-lesson doesn't lose data (PRD §11), syncing on reconnect
- [ ] Accessibility pass on the reader: captions/transcript always visible, adjustable text size, WCAG 2.1 AA contrast

## M3 — Progress, Streaks & Levels

Server-authoritative per PLANNING.md §2.2 — computed on lesson completion, not client state.

- [ ] Implement server-side streak increment on lesson completion (one per calendar day, learner's local timezone)
- [ ] Implement streak freeze (earn one per active week, auto-applied to cover a missed day)
- [ ] Implement known-words aggregation and hours-of-input tracking
- [ ] Implement level-estimate heuristic (known-word count + levels of content completed comfortably)
- [ ] Build the placement quiz (short reading/listening check, or "starting from zero") for onboarding
- [ ] Build the progress dashboard: streak, current level, known-word count, hours of input
- [ ] Add streak milestone markers at 7 days (30/100/365 land in M6, once milestone rewards are in scope)

## M4 — Onboarding & Daily Loop

Ties M1–M3 together into the flows in PRD §9.

- [ ] Build signup/login flow on Auth.js
- [ ] Build onboarding: goal selection + 2–3 interest topics
- [ ] Wire onboarding into the placement quiz (M3) and land the learner in their first lesson same-session
- [ ] Build the home screen: one recommended lesson at the learner's level + interests, no browsing required
- [ ] Build the "browse library" view (by level, by topic) for learners who want to go off-path
- [ ] Implement the daily reminder: Web Push primary, email (Resend) fallback, timed to the learner's usual practice window

## M5 — MVP Launch Readiness

- [ ] Full responsive QA pass: mobile-web, tablet, desktop breakpoints
- [ ] Full accessibility audit against WCAG 2.1 AA (not just the reader)
- [ ] Playwright E2E coverage: onboarding → first lesson → streak increments; word lookup → known-word save; dropped-connection recovery
- [ ] Instrument analytics events for the PRD §10 metrics: D7/D30 retention, streak length, weekly input hours, lesson completion rate
- [ ] Privacy review: confirm learner vocabulary/level/progress data is private by default (PRD §11)
- [ ] Soft launch to a small cohort; watch D7 retention and lesson-completion rate against PRD §10 targets

---

## M6 — Phase 2: Extend Upward

Per PRD §13 Phase 2. Don't start until M0–M5 are live and stable.

- [ ] Produce/license B2–C1 content (imported-adjacent native material, per PRD §6)
- [ ] Build bring-your-own-content import: paste a link (article/video/podcast) → interactive lesson with lookup and level-tagging (B2+ only)
- [ ] Scope imported lessons to the importing learner only — never joined into the shared library (PRD §11 content-rights requirement)
- [ ] Build interest-based recommendation ranking (filter by interest before level, per PRD §7)
- [ ] Add streak milestone rewards at 30/100/365 days

## M7 — Phase 3: Reach Pro (C2)

Per PRD §13 Phase 3. New services likely needed here (e.g. speech-to-text) — decide those when this milestone starts, not before.

- [ ] Produce/license C2 native-media library (radio-style audio, film clips, literature excerpts)
- [ ] Build spaced word review: light, optional resurfacing of known words not recently re-encountered (not flashcard drilling — PRD §5)
- [ ] Build speaking-activation prompts: record a short spoken response to a lesson, from B1+
- [ ] Evaluate and integrate a speech-to-text service for the speaking-activation feature
- [ ] Build an optional DELF/DALF-aligned level check, clearly marked as informal (PRD §12: level estimates are directional, not certified)

---

_Update this file as milestones complete or scope shifts — it should reflect current plan, not a frozen snapshot. Cross-reference [PRD.md](PRD.md) and [PLANNING.md](PLANNING.md) for the "why" behind any task._
