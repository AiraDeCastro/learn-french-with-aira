# Learn French with Aira — Planning

Companion to [PRD.md](PRD.md). The PRD defines _what_ and _why_; this document defines _how it's built_. The stack in §3 is confirmed for MVP (Phase 1 of [PRD.md §13](PRD.md#13-phasing--milestones)) — revisit before Phase 2/3 if scope or team constraints change.

---

## 1. Vision

Learn French with Aira takes a learner from zero French to native-level ("Pro," CEFR C2) through comprehensible input: reading and listening to leveled content slightly above their current ability, every day, with a daily streak to keep exposure consistent.

Three things have to be true of the system for that vision to hold up technically:

- **Content is the product.** The hardest and most valuable thing the system does is hold a large, accurately leveled (A1–C2) library of text+audio content and serve the right next piece to each learner. Architecture should treat content as a first-class, structured asset — not static files bundled with the app.
- **Reading and listening are synchronized.** The reader/player is the core interaction; text-to-audio sync (word/sentence-level timing) and instant word lookup are on the critical path for every session and need to feel instant.
- **Progress is cheap to compute, expensive to fake.** Known-word count, streaks, and level are the visible signals of growth — they need to be simple to read (dashboard) but backed by real activity (a completed lesson + comprehension check), not client-side-only state a learner could spoof.

## 2. Architecture

### 2.1 Shape

Single web application (responsive, no native app for MVP — per PRD non-goals) with a conventional client/server split, backed by a relational database and object storage for audio.

```
┌─────────────────────────┐
│   Browser (React SPA/    │  Reader/player, lookup, dashboard,
│   SSR pages)              │  streak UI, placement quiz
└──────────────┬───────────┘
               │ HTTPS / JSON (typed API)
┌──────────────▼───────────┐
│   App server              │  Auth, lesson delivery, word-save,
│   (API routes)            │  streak calc, level estimation
└───────┬─────────┬─────────┘
        │         │
┌───────▼───┐ ┌───▼─────────────┐
│ Postgres   │ │ Object storage   │  Audio files, transcripts,
│ (content,  │ │ (S3-compatible)  │  cover art
│ users,     │ └──────────────────┘
│ progress)  │
└────────────┘
```

### 2.2 Components

- **Reader/player (client).** Renders synced text + audio for a lesson. Tap-to-translate is a client-side lookup against a bundled/cached lexicon or a lookup API, with an optimistic save to the known-words list. Must work with a dropped connection mid-lesson (PRD §11) — lesson progress and word-saves queue locally and sync on reconnect.
- **Content service.** Owns the leveled library: lessons, their level tag (A1–C2), audio + timestamped transcript, and topic/interest tags. Content authoring is a bigger, more frequent workflow than app-code changes (PRD's #1 flagged risk is content depth), so this should be editable without a code deploy — see the CMS decision in §3.
- **Progress service.** Computes and stores, per learner: known words (word → first-seen date, last-seen date, source lesson), streak (current count, freeze balance, last-completed date), hours of input, and level estimate. Streak/level updates happen server-side on lesson completion, not purely client-side, so they can't be spoofed and survive a device switch.
- **Placement & level-estimation.** A short quiz at signup plus an ongoing heuristic (known-word count + which levels of content the learner completes comfortably) that nudges the stored level estimate. Framed to the user as directional, never a certified CEFR score (PRD §12).
- **Notification service.** One daily reminder, timed to the learner's usual practice window, surfacing that day's suggested lesson.

### 2.3 Data model (sketch)

Core entities: `User`, `Lesson` (level, type, topic tags, audio ref, transcript, comprehension-check questions), `LessonCompletion` (user, lesson, completed_at), `KnownWord` (user, word, first_seen_at, last_seen_at, source_lesson), `Streak` (user, current_count, freeze_balance, last_active_date), `LevelEstimate` (user, level, updated_at, basis).

Content rights matter here too: `Lesson` needs a `source_type` (in-house / licensed / imported) per the licensing requirement in PRD §11, and imported (V2) lessons are scoped to the importing user only, never joined into the shared library.

## 3. Technology Stack

| Layer                        | Choice                                                                                           | Why                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Language**                 | TypeScript, end to end                                                                           | One language across client/server/schema keeps the content and progress data model consistent and typo-proof between reader UI and API.                                                                                                                                                                                                                                              |
| **Frontend framework**       | Next.js (React)                                                                                  | SSR for fast first-paint on the reader (important on mobile web, per PRD's responsive-web requirement), file-based routing, API routes co-located with the app for MVP simplicity.                                                                                                                                                                                                   |
| **Styling**                  | Tailwind CSS                                                                                     | Fast to build a consistent, accessible (WCAG 2.1 AA target) reader UI without a heavy component library fighting custom audio-sync UI.                                                                                                                                                                                                                                               |
| **API layer**                | tRPC on Next.js API routes                                                                       | Typed client/server calls remove a class of bugs in progress/streak endpoints; no schema to hand-maintain against REST.                                                                                                                                                                                                                                                              |
| **Database**                 | PostgreSQL                                                                                       | Relational fit for users, lessons, completions, known words, streaks — mostly joins and counts, not document-shaped data.                                                                                                                                                                                                                                                            |
| **ORM**                      | Prisma                                                                                           | Typed schema/migrations matched to the TypeScript stack.                                                                                                                                                                                                                                                                                                                             |
| **Object storage**           | Cloudflare R2 (S3-compatible)                                                                    | Audio files and cover art, kept out of the database and off the app server; no egress fees, which matters for audio-heavy traffic.                                                                                                                                                                                                                                                   |
| **Auth**                     | Auth.js (NextAuth)                                                                               | Email/social login without a third-party vendor holding learner data — fits the private-by-default stance in PRD §11, and has no separate account/cost to stand up.                                                                                                                                                                                                                  |
| **Content authoring**        | In-app admin panel (custom-built)                                                                | Content is the biggest production lift in the PRD's risk list, so authoring has to ship without a code deploy from day one. A minimal admin panel over the same Prisma schema is faster to build for MVP than integrating a CMS, and keeps content and app data in one database. Revisit a headless CMS (e.g. Sanity) only if a non-engineering content team scales up in Phase 2/3. |
| **Word lookup / dictionary** | Self-hosted French↔English lexicon built from an open dataset (e.g. Wiktionary/FreeDict extract) | Keeps tap-to-translate instant and free of per-lookup API cost or a third-party dependency, and works with the offline-tolerant lesson flow required in PRD §11.                                                                                                                                                                                                                     |
| **Lesson audio**             | Recorded human narration for MVP                                                                 | Pedagogical quality (natural pacing, real prosody) matters most at exactly the levels — A1 mini-stories — where the method concedes learners need the most scaffolding; TTS (e.g. ElevenLabs) is a Phase 2/3 option once content volume, not quality, is the bottleneck.                                                                                                             |
| **Hosting**                  | Vercel                                                                                           | First-class Next.js support, easy preview deploys for content/UI review.                                                                                                                                                                                                                                                                                                             |
| **Notifications**            | Web Push + a transactional email provider (Resend)                                               | Daily streak reminder; email as fallback/onboarding channel.                                                                                                                                                                                                                                                                                                                         |
| **Analytics**                | PostHog (EU-hosted)                                                                              | Covers the PRD §10 metrics (retention, input hours, level-ups) without conflicting with the privacy stance in §11.                                                                                                                                                                                                                                                                   |
| **Testing**                  | Vitest (unit) + Playwright (E2E on the reader/player and streak flows)                           | The reader's audio-text sync and streak logic are exactly the kind of behavior that regresses silently without E2E coverage.                                                                                                                                                                                                                                                         |
| **CI/CD**                    | GitHub Actions → Vercel                                                                          | Test + typecheck on PR, deploy previews, deploy on merge to `master`.                                                                                                                                                                                                                                                                                                                |

This is the confirmed MVP stack — treat it as the default for any scaffolding work, not something to re-litigate per task. Phase 2/3 additions (e.g. speech-to-text for spoken responses, a CMS) get decided when that work starts, not now.

## 4. Required Tools List

Accounts and local tooling needed to work on this project, per the stack confirmed in §3:

### Accounts / services

- [ ] GitHub — already set up (`AiraDeCastro/learn-french-with-aira`)
- [ ] Vercel — hosting + preview deploys
- [ ] Postgres hosting — e.g. Neon or Supabase (managed, branchable for preview environments)
- [ ] Cloudflare R2 — audio/transcript/cover-art storage
- [ ] Resend — transactional email (streak reminders, onboarding)
- [ ] PostHog (EU-hosted) — product analytics
- [ ] Error tracking — e.g. Sentry

Auth.js and the in-app admin panel need no separate accounts — they run inside the app.

### Local development

- [ ] Node.js (LTS) + npm/pnpm
- [ ] Git
- [ ] GitHub CLI (`gh`) — already configured
- [ ] Docker (optional) — local Postgres for offline dev
- [ ] Prisma CLI — schema migrations
- [ ] Vercel CLI — env pulls, local preview parity

### Content production (once content work starts)

- [ ] Audio recording/editing tool for mini-story narration (e.g. Audacity)
- [ ] A forced-alignment tool (e.g. Aeneas or Whisper timestamps) to generate word/sentence-level timing for text-audio sync, unless timings are authored by hand
- [ ] An open lexicon dataset (e.g. a Wiktionary/FreeDict extract) to seed the self-hosted word-lookup dictionary

---

_Stack and tooling here are confirmed for the MVP scope in [PRD.md §13, Phase 1](PRD.md#13-phasing--milestones). Phase 2/3 work (import, speaking-activation) will need additional services — e.g. speech-to-text for spoken responses — decided when that work starts._
