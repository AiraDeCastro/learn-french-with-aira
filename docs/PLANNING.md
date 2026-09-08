# Learn French with Aira — Planning

Companion to [PRD.md](PRD.md). The PRD defines *what* and *why*; this document defines *how it's built*. Stack choices below are a proposed starting point, not yet locked in — revisit if the team or constraints change.

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

| Layer | Choice | Why |
|---|---|---|
| **Language** | TypeScript, end to end | One language across client/server/schema keeps the content and progress data model consistent and typo-proof between reader UI and API. |
| **Frontend framework** | Next.js (React) | SSR for fast first-paint on the reader (important on mobile web, per PRD's responsive-web requirement), file-based routing, API routes co-located with the app for MVP simplicity. |
| **Styling** | Tailwind CSS | Fast to build a consistent, accessible (WCAG 2.1 AA target) reader UI without a heavy component library fighting custom audio-sync UI. |
| **API layer** | tRPC (or REST if the team prefers) on Next.js API routes | Typed client/server calls remove a class of bugs in progress/streak endpoints; REST is a fine fallback if multiple client types are added later. |
| **Database** | PostgreSQL | Relational fit for users, lessons, completions, known words, streaks — mostly joins and counts, not document-shaped data. |
| **ORM** | Prisma | Typed schema/migrations matched to the TypeScript stack. |
| **Object storage** | S3-compatible (Cloudflare R2 or AWS S3) | Audio files and cover art; keep out of the database and off the app server. |
| **Auth** | Auth.js (NextAuth) or Clerk | Email/social login; learner data is private-by-default (PRD §11), so auth needs to be solid but doesn't need to be custom-built. |
| **Content authoring** | Headless CMS (e.g. Sanity) *or* an in-app admin panel | Content is the biggest production lift in the PRD's risk list — whichever is chosen, it must let non-engineers add/tag/level lessons without a code deploy. Start with a minimal in-app admin panel for MVP; move to a CMS if a non-engineering content team comes on. |
| **Hosting** | Vercel | First-class Next.js support, easy preview deploys for content/UI review. |
| **Notifications** | Web Push + a transactional email provider (e.g. Resend) | Daily streak reminder; email as fallback/onboarding channel. |
| **Analytics** | Privacy-respecting product analytics (e.g. PostHog, self-hosted or EU-hosted) | Needed for the PRD §10 metrics (retention, input hours, level-ups) without conflicting with the privacy stance in §11. |
| **Testing** | Vitest (unit) + Playwright (E2E on the reader/player and streak flows) | The reader's audio-text sync and streak logic are exactly the kind of behavior that regresses silently without E2E coverage. |
| **CI/CD** | GitHub Actions → Vercel | Test + typecheck on PR, deploy previews, deploy on merge to `master`. |

**Not decided yet / explicitly deferred:** dictionary/lookup data source for tap-to-translate (build vs. license vs. API), text-to-speech vs. recorded-only audio for mini-stories, and the specific CMS vendor. Flag these to the user before committing engineering time.

## 4. Required Tools List

Accounts and local tooling needed to work on this project, once the stack above is confirmed:

### Accounts / services
- [ ] GitHub — already set up (`AiraDeCastro/learn-french-with-aira`)
- [ ] Vercel — hosting + preview deploys
- [ ] Postgres hosting — e.g. Neon or Supabase (managed, branchable for preview environments)
- [ ] S3-compatible object storage — e.g. Cloudflare R2 or AWS S3, for audio/transcripts
- [ ] Auth provider — Auth.js needs no separate account; Clerk would need one
- [ ] Headless CMS (if chosen over in-app admin) — e.g. Sanity
- [ ] Transactional email — e.g. Resend, for streak-reminder and onboarding email
- [ ] Product analytics — e.g. PostHog (EU-hosted or self-hosted, for privacy)
- [ ] Error tracking — e.g. Sentry

### Local development
- [ ] Node.js (LTS) + npm/pnpm
- [ ] Git
- [ ] GitHub CLI (`gh`) — already configured
- [ ] Docker (optional) — local Postgres for offline dev
- [ ] Prisma CLI — schema migrations
- [ ] Vercel CLI — env pulls, local preview parity

### Content production (once content work starts)
- [ ] Audio recording/editing tool for mini-story narration (e.g. Audacity) or a TTS pipeline, if that route is chosen
- [ ] A forced-alignment tool (e.g. Aeneas or Whisper timestamps) to generate word/sentence-level timing for text-audio sync, unless timings are authored by hand

---

*Stack and tooling choices here support the MVP scope in [PRD.md §13, Phase 1](PRD.md#13-phasing--milestones). Revisit before starting Phase 2/3 work, since import (V2) and speaking-activation (V2) features may need additional services (e.g. speech-to-text for spoken responses).*
