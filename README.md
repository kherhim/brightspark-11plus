# Brightspark 11+ — Adaptive 11+ Practice

A free, **private**, browser-based adaptive practice app for the UK
senior-school entrance exams (the "11+", sat in Year 6). It runs entirely in
the browser — **no account, no sign-up, nothing leaves the device** — and
saves progress locally. Built for any child preparing for the 11+ (set the
child's name on the Parent page to personalise it).

**Live:** <https://kherhim.github.io/brightspark-11plus/>

> Currently covers **Maths**. Verbal Reasoning, Non-Verbal Reasoning and
> (auto-markable) English are on the roadmap below.

## What it does

- **12 maths topics** across the broad 11+ syllabus: place value, +/−, ×/÷,
  fractions, decimals, percentages, ratio & proportion, algebra & sequences,
  measurement & money, geometry & angles, perimeter/area/volume, statistics.
- **733 generated question forms** across 6 difficulty levels, calibrated
  hard: **Level 1 is already solid Year 5/6**, Level 6 is genuine
  scholarship / CEM / CSSE standard. Every form re-randomises its numbers, so
  there are **~11,000+ distinct questions** — the child learns the *method*,
  not memorised answers — plus **58 curated multi-step / scholarship word
  problems**. The exact live count is shown on the Parent page.
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
- **Parent dashboard**: set the child's name, see per-topic level, accuracy,
  time on task, recent mistakes, and export/import/reset progress.

## Run it locally

ES modules need to be served over http (opening the file directly won't work):

```bash
cd path/to/brightspark-11plus
python3 -m http.server 8000
```

Then open <http://localhost:8000/> in any modern browser. No build step, no
dependencies.

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
answers, unique multiple-choice options, deterministic from a seed), the
adaptive engine's promotion/demotion/mastery rules, the **v3→v4 migration**
(existing progress is preserved), **mock mode** (seed reproducibility and that
a mock never moves the ladder), and the curated schema.

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

## How it's built

Plain HTML + CSS + ES modules, no framework:

```
index.html · style.css · .nojekyll
js/  rng · format · store · topics · engine · questionFactory · curated · main
js/persistence/  adapter · localAdapter   (one async surface; cloud-sync ready)
js/generators/  _shared + 12 topic modules + index
js/ui/  router · components · screenHome · screenQuiz · screenMock ·
        screenTopics · screenParent
data/curated.json
tests/  test.html · harness · *.test.js (incl. migration, mock) · run-node.mjs
```

The app never touches `localStorage` directly — every screen goes through
`js/persistence/adapter.js`. Swapping `activeAdapter` for a future
`cloudAdapter.js` (same five methods, last-writer-wins on `state.updatedAt`)
adds optional cross-device sync with **no screen changes**.

## Roadmap

- **Phase 2 — Smart review + fix-it**: spaced re-testing of the child's *own*
  mistakes, plus auto-detected recurring-error mini-lessons.
- **Phase 3 — Readiness & speed analytics**: an explainable readiness band
  tuned to a target board (GL/CEM/ISEB/CSSE) and "accurate but too slow"
  fluency flags.
- **Phase 4 — More subjects + engagement**: Verbal & Non-Verbal Reasoning and
  auto-markable English, plus streaks, daily goals and printable worksheets.
