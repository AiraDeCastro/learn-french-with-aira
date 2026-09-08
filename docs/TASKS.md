# Learn French with Aira — Tasks

Working checklist derived from [PRD.md](PRD.md) (scope) and [PLANNING.md](PLANNING.md) (stack/architecture). Milestones M0–M5 deliver the MVP (PRD §13 Phase 1); M6–M7 map to PRD Phase 2/3. Work top to bottom — don't start a later milestone's tasks early unless blocked.

---

## M0 — Project Foundations

Scaffolding per [PLANNING.md §3](PLANNING.md#3-technology-stack); nothing product-specific yet.

- [ ] Init Next.js + TypeScript project, with Tailwind CSS configured
- [ ] Set up ESLint, Prettier, and TypeScript strict mode
- [ ] Provision Postgres (Neon or Supabase) and connect Prisma
- [ ] Set up tRPC router scaffolding (client + server)
- [ ] Configure Auth.js (email + at least one social provider)
- [ ] Provision Cloudflare R2 bucket for audio/transcripts/cover art
- [ ] Connect Vercel project with preview deploys on PR
- [ ] Set up GitHub Actions: typecheck + lint + test on every PR
- [ ] Wire up Sentry error tracking
- [ ] Wire up PostHog (EU-hosted) analytics
- [ ] Configure Vitest and Playwright test runners (empty smoke test passing)

## M1 — Content Model & Admin Panel

The library is the product (PLANNING.md §1) — content tooling comes before learner-facing UI.

- [ ] Design Prisma schema: `User`, `Lesson`, `LessonCompletion`, `KnownWord`, `Streak`, `LevelEstimate`
- [ ] Add `Lesson.level` (A1–C2), `Lesson.type` (mini-story / graded reader / podcast / news / imported), `Lesson.topicTags`
- [ ] Add `Lesson.sourceType` (in-house / licensed / imported) per the content-rights requirement (PRD §11)
- [ ] Build in-app admin panel: create/edit a lesson, set level + topic tags, upload audio + transcript, upload cover art
- [ ] Build transcript-timing input in the admin panel (word/sentence timestamps, hand-entered or via forced-alignment output)
- [ ] Write and record the first A1 mini-story set (30–40 high-frequency words, per PRD §6) — enough lessons to support a real onboarding flow, not placeholders
- [ ] Seed the self-hosted lexicon from an open dataset (Wiktionary/FreeDict extract) for word lookup

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

*Update this file as milestones complete or scope shifts — it should reflect current plan, not a frozen snapshot. Cross-reference [PRD.md](PRD.md) and [PLANNING.md](PLANNING.md) for the "why" behind any task.*
