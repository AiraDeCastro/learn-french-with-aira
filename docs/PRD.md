# Learn French with Aira — Product Requirements Document

**Status:** Draft v0.1
**Owner:** Aira
**Date:** 8 Sept 2026
**Platform:** Web

> A comprehensible-input app that takes a learner from their first _bonjour_ to reading Camus and following French radio without subtitles — one streak at a time.

---

## 1. Overview & Vision

Learn French with Aira is a web app for acquiring French the way fluent speakers acquire any language: by reading and listening to things they mostly understand, a little above their current level, every single day.

Rather than teaching French through grammar drills and flashcards, Aira organizes a library of French content — stories, dialogues, podcasts, news, and native media — by difficulty, and guides each learner through it at the edge of their comprehension. A daily streak keeps the one variable that predicts fluency, **consistent exposure**, front and center.

The product spans a learner's entire arc: from an absolute beginner who knows zero French words, through the intermediate plateau where most learners quit, to a "Pro" tier where they read novels, listen to French radio, and watch films without subtitles.

## 2. Problem & Opportunity

Most language apps optimize for the wrong thing. Flashcard and gamified-drill apps (Duolingo-style) reward completing exercises, not understanding French — learners "finish" a tree of lessons and still can't follow a French podcast. Traditional courses front-load grammar before learners have enough exposure for the rules to mean anything.

Comprehensible input — reading and listening to material you mostly understand, slightly above your level — is the method linguists and hyperpolyglots point to as what actually produces fluency, but it's hard for a self-directed learner to execute well:

- **Finding "i+1" content is hard.** Learners don't know what's appropriately levelled for them, so they pick content that's either too easy to grow from or too hard to follow.
- **Looking up words breaks flow.** Switching to a dictionary mid-sentence kills the immersive reading/listening experience that makes input effective.
- **There's no sense of progress.** Without a level system or a record of known words, learners can't tell if they're improving, so they lose motivation.
- **Consistency is the hardest part.** Input-based acquisition needs hundreds of hours over months; nothing in a plain reading habit creates the daily pull that keeps a learner coming back.

Aira's opportunity is to combine a well-structured, leveled comprehensible-input library with the lightweight tooling (instant lookup, known-word tracking) and behavioral hook (streaks) that make the method sustainable for an everyday learner.

## 3. Goals & Non-Goals

### Goals

- Let a complete beginner start producing and understanding basic French within their first sessions, via scaffolded input (mini-stories, bilingual text).
- Give every piece of content a clear level (A1–C2) so learners always know what "slightly harder than today" looks like.
- Make daily practice a habit through visible streaks, reminders, and low-friction "just open and read/listen" sessions.
- Track tangible progress — known words, hours of input, current level — so growth is visible even when it doesn't feel fast.
- Carry a learner all the way from A1 to C2 ("Pro"), where they can consume native French media unaided.

### Non-goals (for now)

- Live tutoring, conversation exchange, or speaking-practice video calls.
- Certification or exam prep (DELF/DALF) as a first-class product — may be referenced for level framing only.
- Native mobile apps — the product ships as a responsive web app first.
- Support for languages other than French.

## 4. Target Users

**Marie, 27 — True Beginner.** Wants to learn French for an upcoming move to Montréal. Knows "bonjour" and "merci." Needs heavy scaffolding — audio with transcripts, translations on tap — before raw native content is usable at all.

**Devon, 34 — Stalled Intermediate.** Can conjugate verbs on a worksheet but freezes watching a French show. Needs content that finally bridges classroom French to real, spoken French — and a reason to keep showing up daily.

**Priya, 41 — Advanced Hobbyist.** Understands most written French already. Wants a steady stream of native-level books, podcasts, and film recommendations, plus a way to see her vocabulary keep growing toward "Pro."

## 5. Method: Comprehensible Input

The product's pedagogy follows Stephen Krashen's **input hypothesis**: people acquire language by understanding messages, not by memorizing rules. The target difficulty is what Krashen calls **i+1** — content just above the learner's current level (`i`), where they grasp the overall meaning but are still regularly meeting new words and structures. Content that's fully understood teaches nothing new; content that's mostly incomprehensible is just noise.

Aira's content strategy and level framework are adapted from the practical breakdown of comprehensible input by level in ["Comprehensible Input Examples and Strategies That Actually Work"](https://blog.thelinguist.com/comprehensible-input-examples/) — used here as the working reference for what belongs at each stage.

**Two habits the product should reinforce, straight from the method:** read and listen to the same content together whenever possible (eyes fill in what ears miss, and vice versa), and let learners look up an unknown word and move on rather than stopping to drill it — most words need 8–15 exposures before they stick, so the library needs to bring words back around, not force immediate mastery.

## 6. Level Framework, A1 → Pro

Aira uses the CEFR scale (A1–C2), the same one the DELF/DALF French proficiency exams are built on, so a learner's in-app level maps to something recognized outside the app. **C2 is branded "Pro"** in-product: the tier where a learner engages with native French media the way a native speaker would.

| Level  | Stage              | Comprehensible input examples                                                                                                                                                 |
| ------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** | Absolute beginner  | Mini-stories built on 30–40 high-frequency words repeated across many short scenes; graded readers; bilingual (FR/EN) parallel texts; short audio clips with full transcripts |
| **A2** | Elementary         | Longer mini-story arcs; beginner graded readers without translation scaffolding; audio-with-transcript at natural-ish pace                                                    |
| **B1** | Intermediate       | Learner podcasts (slow, clear French with subtitles — à la Easy French); simplified news bulletins; French-dubbed or subtitled shows the learner already knows the plot of    |
| **B2** | Upper intermediate | Imported content — any YouTube video, article, or podcast episode the learner brings in; native news at normal speed; unfamiliar shows with FR subtitles                      |
| **C1** | Advanced           | French novels and nonfiction; native podcasts (history, culture, politics); audiobooks during passive listening                                                               |
| **C2** | Pro                | Live French radio (France Culture-style), films with no subtitles, dense literature — content chosen purely by interest, not level                                            |

## 7. Core Features

### MVP

- **Leveled content library** — Curated French content (text + audio) tagged A1–C2, browsable by level and by topic/interest.
- **Read-and-listen player** — Text and audio play in sync, current sentence highlighted, per the "combine reading and listening" principle.
- **Tap-to-translate word lookup** — Tapping any French word shows its meaning inline and saves it to the learner's personal word list — no flow-breaking dictionary switch.
- **Known-words tracker** — Every word looked up or marked known is tracked; the count is a visible, ever-growing progress number independent of "lessons completed."
- **Daily streaks** — Completing one lesson (one story, one podcast segment, one reading) per day extends the learner's streak; see Section 8.
- **Level placement & progression** — A short placement flow at signup estimates starting level (A1–C1); an in-app estimate updates over time from known-word count and content completed comfortably.
- **Progress dashboard** — Streak, current level, known words, and hours of input in one view.

### V2

- **Bring-your-own content (import)** — Learners at B2+ paste in a link (article, YouTube video, podcast) and Aira turns it into an interactive lesson with lookup and level-tagging.
- **Spaced word review** — A lightweight, optional review of saved words the learner hasn't re-encountered recently.
- **Speaking activation** — Once a learner reaches B1+, prompts to record short spoken responses to activate passive vocabulary.
- **Interest-based content matching** — Onboarding captures topics the learner cares about; recommendations filter by interest before level.

## 8. Streaks & Motivation

A streak increments once per calendar day (learner's local timezone) the first time they complete one full lesson unit — finishing a mini-story, a podcast segment, or a reading passage with its comprehension check. Passive activity like browsing the library does not count.

- **Daily goal, not time goal.** One completed lesson maintains the streak, whether it takes three minutes (A1 mini-story) or thirty (C1 podcast).
- **Streak freeze.** Learners earn one freeze per week of an active streak, usable to cover a missed day.
- **Milestone recognition** at 7, 30, 100, and 365 days, tied to visible in-app markers rather than currency or points.
- **Reminder, not nag.** One optional daily notification, timed to the learner's usual practice time, offering the day's suggested lesson at their level.

## 9. Key User Flows

### Onboarding & placement

1. **Set the goal** — Learner picks why they're learning French (travel, heritage, work, media) and 2–3 topics they're interested in.
2. **Quick placement** — A short reading/listening check (or "I'm starting from zero") estimates a starting level, A1–C1.
3. **First lesson, same session** — Learner completes one short lesson immediately — the streak starts on day one.

### Daily lesson loop

1. **Open today's pick** — Home screen surfaces one recommended lesson at the learner's level and interests.
2. **Read & listen** — Learner works through synced text/audio, tapping unfamiliar words as they go.
3. **Wrap the lesson** — A brief comprehension check confirms the lesson counts; streak, known-word count, and input-hours update.
4. **Choose to continue** — Stop with the streak secured, or keep going into the next-level-up content.

## 10. Success Metrics

| Metric              | Target                                                   |
| ------------------- | -------------------------------------------------------- |
| D7 retention        | ≥ 35%                                                    |
| D30 retention       | ≥ 18%                                                    |
| Median streak       | 10+ days                                                 |
| Weekly input        | 3+ hours (reading + listening)                           |
| Level-ups / quarter | 1 sub-level (e.g. A2 → B1) for a learner active 60+ days |
| Lesson completion   | ≥ 80% of started lessons reach the comprehension check   |

## 11. Non-Functional Requirements

- **Performance** — Text-audio sync stays perceptibly instant (<150ms); word lookup responds in under 300ms.
- **Content rights** — All library audio/text is licensed, public-domain, or produced in-house; imported user content (V2) is for personal study only, never redistributed.
- **Accessibility** — WCAG 2.1 AA: full keyboard navigation, captions on all audio, adjustable text size.
- **Offline resilience** — An opened lesson tolerates a dropped connection without losing streak/word-save progress.
- **Privacy** — Learner vocabulary and level data are private by default.
- **Responsive web** — Full functionality on mobile-web, tablet, and desktop; no native app in MVP.

## 12. Risks & Assumptions

- **Content depth** — Six CEFR levels of genuinely leveled, engaging content is a large production lift. MVP may need to launch narrow (A1–B1) and extend upward.
- **Streaks ≠ input** — A streak mechanic can be gamed by opening the shortest possible lesson daily. Mitigate by making the minimum "counts" unit still deliver meaningful new input.
- **Level self-assessment** — Placement and ongoing level estimates are approximate; treat as directional, not a certified CEFR score.
- **Beginner cold-start** — A1 can't be pure input — mini-stories and heavy scaffolding are required first. Underinvesting here breaks the top of the funnel.
- **Retention economics** — Fluency realistically takes hundreds of hours over months/years (roughly 600–1,000 hours for European languages, per FSI estimates) — the product must sustain motivation over a much longer horizon than a typical app habit loop.

## 13. Phasing & Milestones

**Phase 1 — MVP**

- A1–B1 content library (mini-stories, graded readers, learner podcasts)
- Synced reader/player + tap-to-translate
- Streaks, known-word tracker, progress dashboard
- Basic placement quiz

**Phase 2 — Extend upward**

- B2–C1 native-adjacent content
- Bring-your-own content import
- Interest-based recommendations
- Streak freeze + milestone rewards

**Phase 3 — Reach Pro (C2)**

- C2 native-media library (radio, film, literature)
- Spaced word review
- Speaking-activation prompts
- Optional DELF/DALF-aligned level check

## 14. Open Questions

- Do we license an existing graded-content catalog for A1–B1, or produce mini-stories in-house from day one?
- Is the placement test purely reading-based, or does it also assess listening at signup?
- What's the minimum lesson unit that "counts" for a streak — fixed word count, fixed duration, or a comprehension-check pass?
- Should streaks and levels be shareable/social, or stay private in v1?
- Pricing model — free tier limited by level or by daily lessons, with a paid tier unlocking the full library?

---

_Comprehensible-input level framework and content strategy (Sections 5–6) adapted from ["Comprehensible Input Examples and Strategies That Actually Work,"](https://blog.thelinguist.com/comprehensible-input-examples/) The Linguist Blog. Level naming follows the CEFR scale (A1–C2) used by the French DELF/DALF exams._
