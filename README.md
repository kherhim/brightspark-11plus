# Brightspark Prep — Adaptive 11+ Practice

A browser-based adaptive practice app for the UK senior-school entrance exams
(the "11+", sat in Year 6). **Free to start with no account needed to
practise**; progress saves locally in the browser. Built for any child
preparing for the 11+ (set the child's name on the Parent page to
personalise it).

**Live:** <https://brightsparkprep.com/>

> Covers all four 11+ subjects: **Maths, Verbal Reasoning, Non-Verbal
> Reasoning and (auto-markable) English**.

## What it does

- **All four 11+ subjects**, grouped on the Topics/Home/Parent screens with
  a per-subject readiness summary:
  - **Maths (12 topics)** — place value, +/−, ×/÷, fractions, decimals,
    percentages, ratio & proportion, algebra & sequences, measurement &
    money, geometry & angles, perimeter/area/volume, statistics.
  - **Verbal Reasoning (7)** — synonyms & antonyms, word analogies, odd one
    out, letter sequences, letter & number codes, number/word logic, word
    manipulation.
  - **Non-Verbal Reasoning (5)** — figure series, matrices, odd one out,
    figure analogies, rotation & reflection, drawn as deterministic inline
    SVG that re-randomises every attempt.
  - **English (6)** — spelling, grammar, punctuation, vocabulary in context,
    cloze (gap-fill) and reading comprehension, all auto-markable
    multiple-choice (composition/essay is deliberately out of scope).
- **900+ generated question forms** across 6 difficulty levels, calibrated
  hard: **Level 1 is already solid Year 5/6**, Level 6 is genuine
  scholarship / CEM / CSSE standard. Every form re-randomises its content, so
  there are **~13,000+ distinct questions** — the child learns the *method*,
  not memorised answers — plus **58 curated multi-step / scholarship maths
  word problems**. The exact live count is shown on the Parent page.
- **Adaptive per topic**: every topic **starts at Level 3**; **2 correct in a
  row** moves up a level; 2 wrong in a row eases it back. Weak topics are
  revisited more often; mastered topics still recur to stay fresh.
- **Teaches when the child slips**: a wrong answer shows *why* that specific
  choice was tempting (the common misconception), the full worked solution,
  and the key idea — plus a one-tap "try an easier one".
- **Timed mock exams**: a fixed-length (10/20/30), mixed-topic paper at the
  child's current level with a countdown and **no feedback until the end** —
  then a marked report (score, an 11+ readiness band, per-topic breakdown)
  with every question worked through. A mock **informs** progress but
  **never moves the practice difficulty** up or down.
- **Smart review + fix-it**: every wrong answer (practice or mock) is logged
  and queued on a **Leitner spaced-repetition** schedule, then re-tested
  *with fresh numbers* so the child relearns the method, not a memorised
  answer. When one misconception keeps recurring, a targeted **fix-it
  mini-lesson + 5-question drill** is offered.
- **Readiness & speed analytics**: an *explainable* readiness band per topic,
  **per subject** and overall (mastery + accuracy + level + pace, gated by
  attempts so luck can't read "Exam-ready"), tuned to a parent-picked
  **target board (GL / CEM / ISEB / CSSE)** — a board that doesn't sit a
  subject (e.g. CSSE has no VR/NVR) correctly drops it from the picture —
  plus **"accurate but slow"** vs **"fast but careless"** fluency flags from
  per-question pace.
- **Engagement**: a daily **streak**, a parent-set **daily goal** with a
  today's-progress ring, and **achievement badges** (first steps, streaks,
  goal met, century/marathon, mock ace, topic master, polymath) — shown on
  Home and the Parent page. A mock can earn badges but never inflates the
  streak or goal.
- **Printable worksheets**: pick a subject, topic, level and length and get a
  clean printable sheet with a separate **answer key** page (`#/worksheet`).
  Numbers re-randomise, and "New set" reseeds for a fresh sheet.
- **Parent dashboard**: set the child's name and target board, see per-subject
  and per-topic level, accuracy, readiness, pace, time on task, streak/goal/
  badges, **top error patterns**, the full mistake log (practice / mock /
  review), and export/import/reset.

## Run it locally

ES modules need to be served over http (opening the file directly won't work):

```bash
cd path/to/brightspark-11plus
python3 -m http.server 8000
```

Then open <http://localhost:8000/> in any modern browser: `/` is the
**landing page** and `/app.html` is the **practice app** (`/app.html#/home`
etc.). No build step, no dependencies.

## Privacy

There is no backend, no analytics, and no account. All progress lives in this
browser's `localStorage` and is never transmitted anywhere. To move progress
between devices, use **Export progress** on the Parent page and **Import** it
on the other device.

> **Updating safely:** the storage schema is versioned (currently v4). When
> the app is updated, existing progress is **migrated forward field-by-field,
> never wiped** — the child keeps their levels, accuracy and mistake history.
> (Implementation note: the `localStorage` slot name is a fixed legacy string
> and is intentionally *not* renamed across releases; renaming it would
> orphan a child's existing save. The real version lives in
> `state.schemaVersion`.)

## Deploy (GitHub Pages)

It's a zero-build static site, so any static host works. For GitHub Pages:

```bash
git add -A && git commit -m "…" && git push
```

Pages redeploys automatically in ~1 minute. All paths are relative and
`.nojekyll` is committed, so the project sub-path URL works with no extra
config.

## Run the tests

- **In a browser** (full suite, incl. the curated bank): start the server
  above and open <http://localhost:8000/tests/test.html>.
- **In Node** (logic only, fast): `node tests/run-node.mjs`

The suite checks every generator at every level (valid structure, clean
answers, unique multiple-choice options, deterministic from a seed —
including byte-identical inline SVG for the NVR generators), the adaptive
engine's promotion/demotion/mastery rules, the **migration** (existing
progress is preserved through v3→v4 and the additive Phase-4A `activity`
field with no schema bump), **mock mode** (seed reproducibility and that a
mock never moves the ladder), **smart review** (Leitner promotion/demotion,
misconception aggregation, fresh same-template re-draw), **analytics**
(quantiles, pace-flag boundaries, monotonic readiness, per-subject and board
reweighting), the **engagement** layer (local-day streak/goal logic and
idempotent badge earning), **board profiles** (CSSE excludes VR/NVR), the
**worksheet builder** (deterministic, count/level clamping), and the curated
schema.

## Tweaking it

- **Difficulty feel** — the knobs (promote/demote thresholds, mastery
  threshold, weak-topic weighting, mock weighting) are named constants at the
  top of `js/engine.js`.
- **Add curated word problems** — append entries to `data/curated.json`
  following the existing shape (`tests/curated.test.js` validates them).
- **Add question types** — add a template to the relevant file in
  `js/generators/`. Each template is `{ id, min, max, fn(level, rng) }` and
  returns `q({...})` (multiple choice) or `numeric({...})`; the form count and
  tests pick it up automatically.
- **VR/English word content** — the frequency-banded word/passage data lives
  in `js/generators/_words.js` (`band` 1–6 maps to difficulty). NVR figures
  are built from `js/generators/_svg.js` (pure attribute-vector → SVG string;
  keep it deterministic — no `Math.random`/`Date`).
- **Engagement** — badge definitions are a pure catalogue in
  `js/engagement.js`; the daily goal default is `profile.dailyGoal` in
  `js/store.js`.

## How it's built

Plain HTML + CSS + ES modules, no framework:

```
index.html (landing) · app.html (the SPA) · style.css · .nojekyll
js/  rng · format · store · topics · engine · questionFactory · curated ·
     review · fixits · analytics · boards · engagement · entitlement ·
     answers · print · main
js/persistence/  adapter · localAdapter   (one async surface; cloud-sync ready)
js/generators/  _shared + _words + _svg + 30 topic modules + index
js/ui/  router · components · screenHome · screenQuiz · screenMock ·
        screenReview · screenTopics · screenWorksheet · screenParent
data/  curated.json · fixits.json
tests/  test.html · harness · *.test.js (migration, mock, review, analytics,
        engagement, boards, print, …) · run-node.mjs
```

The app never touches `localStorage` directly — every screen goes through
`js/persistence/adapter.js`. Swapping `activeAdapter` for a future
`cloudAdapter.js` (same five methods, last-writer-wins on `state.updatedAt`)
adds optional cross-device sync with **no screen changes**.

## Roadmap

- **Phase 1 — ✅ shipped**: timed mock exams, schema v4 + safe migration,
  persistence adapter (cloud-sync ready).
- **Phase 2 — ✅ shipped**: smart review (Leitner spaced repetition of the
  child's own mistakes) + auto-detected recurring-error fix-it lessons.
- **Phase 3 — ✅ shipped**: explainable readiness band tuned to a target
  board (GL/CEM/ISEB/CSSE) + "accurate but slow" / "fast but careless"
  fluency flags.
- **Phase 4A — ✅ shipped**: Verbal & Non-Verbal Reasoning and auto-markable
  English added as full subjects, plus the engagement layer (streaks, daily
  goals, badges) and printable worksheets — all still free, static and
  local-first, with no breaking change to saved progress.
- **Phase 5+ — cloud (planned, opt-in)**: an optional accounts + magic-link
  backend so progress can sync across devices, then privacy-safe cohort
  **benchmarking** and a flag-gated paid AI essay-marking add-on. These
  introduce a backend and are a deliberate separate effort; the free
  local-first app keeps working untouched until any cutover.
