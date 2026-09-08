# Learn French with Aira

A comprehensible-input French learning web app: leveled content (CEFR A1–C2) plus daily streaks, taking a learner from zero French to native-level ("Pro").

Full spec: [docs/PRD.md](docs/PRD.md) — read it before making product decisions this file doesn't cover.
Architecture, stack, and tooling: [docs/PLANNING.md](docs/PLANNING.md).

## Project status

Pre-code. No app has been scaffolded yet, but the MVP tech stack is confirmed — see [docs/PLANNING.md §3](docs/PLANNING.md#3-technology-stack): Next.js + TypeScript, Tailwind, tRPC, PostgreSQL + Prisma, Cloudflare R2, Auth.js, Vercel. Use it as the default for any scaffolding work rather than re-deciding per task. Phase 2/3 additions (CMS, speech-to-text, etc.) aren't decided yet — flag those to the user when that work comes up.

## Product method — don't design against this

The product's entire pedagogy is Krashen's **comprehensible input / i+1**: learners acquire French by reading and listening to material *slightly* above their current level, not by drilling grammar or vocabulary out of context. Concretely:

- Content is not "correct/incorrect" graded exercises — it's leveled reading/listening material (stories, podcasts, news, native media) with lookup and comprehension support.
- Word lookup should never interrupt reading/listening flow (no modal dictionary detours) and should always **save the word** rather than just define it.
- Don't add flashcard/SRS drilling as a primary mechanic. Spaced review (V2) is a light, optional nudge back toward *re-encountering* words in real content, not isolated drill.
- Reading and listening should be able to run in sync (text highlights with audio) wherever content has both.

## Domain vocabulary

| Term | Meaning |
|---|---|
| **Level** | CEFR scale A1–C2, matching French DELF/DALF exam levels. Every piece of content is tagged with one. |
| **Pro** | In-product branding for C2 — native-level, content chosen by interest not level. |
| **i+1** | Krashen's term for the target difficulty: just above the learner's current level. |
| **Known word** | A word the learner has looked up or marked known; the running count is a core progress signal, tracked independently of "lessons completed." |
| **Lesson** | One unit of content (a mini-story, a podcast segment, a reading) with a comprehension check at the end. Completing one is what extends a streak. |
| **Streak** | Consecutive calendar days (learner's local timezone) with at least one completed lesson. One freeze/week is earned to cover a missed day. |
| **Mini-story** | Short beginner (A1) content built from a small set of ~30–40 high-frequency words repeated across many scenes. |
| **Import** (V2) | Learner-supplied content (article/video/podcast link) turned into an interactive lesson — B2+ only. |

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
