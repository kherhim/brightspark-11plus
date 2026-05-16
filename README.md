# Syon 11+ Maths — Adaptive Practice

A browser-based, **adaptive** maths question bank to prepare Syon for UK
senior-school entrance exams (the "11+", sat in Year 6). It runs entirely in
the browser — no account, no internet needed once loaded — and saves progress
on the device.

## What it does

- **12 topics** covering the broad 11+ syllabus: place value, +/−, ×/÷,
  fractions, decimals, percentages, ratio & proportion, algebra & sequences,
  measurement & money, geometry & angles, perimeter/area/volume, statistics.
- **733 generated question forms** across 6 difficulty levels, recalibrated
  HARD: **Level 1 is already solid Year 5/6**, Level 6 is genuine
  scholarship / CEM / CSSE standard (multi-step, large/awkward numbers,
  reverse problems). Because every form re-randomises its numbers, there are
  **~11,000+ distinct questions** — Syon learns the *method*, he can't
  memorise answers — plus **58 curated multi-step / scholarship word
  problems**. The exact live count is shown on the Parent page.
- **Adaptive per topic**: every topic **starts at Level 3** (a strong child
  shouldn't waste time on easy questions); **2 correct in a row** moves him up
  a level; 2 wrong in a row eases it back. Weak topics are revisited more
  often; mastered topics still recur to stay fresh.
- **Teaches when he slips**: a wrong answer shows *why* that specific choice was
  tempting (common misconception), the full worked solution, and the key idea —
  plus a one-tap "try an easier one".
- **Parent dashboard**: per-topic level, accuracy, time on task, recent
  mistakes, and progress export/import/reset.

## Run it locally

ES modules need to be served over http (opening the file directly won't work):

```bash
cd /Users/himanshu.kher/Documents/devProjects/forSyon
python3 -m http.server 8000
```

Then open <http://localhost:8000/> in any modern browser.
(No build step, no dependencies.)

## Put it online (so Syon can use it on any device)

The directory isn't a git repo yet, and publishing needs **your** GitHub
account, so these steps are run by you:

```bash
# 1. One-time GitHub login in this terminal (type the ! so it runs here):
#    ! gh auth login

# 2. From the project folder:
git init && git add -A && git commit -m "Syon 11+ maths app"

# 3. Create the repo and push (public so GitHub Pages is free):
gh repo create syon-11plus --public --source=. --remote=origin --push
```

Then on github.com → your `syon-11plus` repo → **Settings → Pages** →
Source: *Deploy from a branch*, Branch: `main`, folder `/ (root)` → Save.

After a minute the app is live at
`https://<your-username>.github.io/syon-11plus/`. All paths are relative and
`.nojekyll` is included, so the sub-path URL works with no extra config.

> Progress is stored per-browser. To move it between devices, use **Export
> progress** on the Parent page and **Import** it on the other device.

## Run the tests

- **In a browser** (full suite, incl. curated bank): start the server above and
  open <http://localhost:8000/tests/test.html>. It prints a pass/fail summary.
- **In Node** (logic only, fast): `node tests/run-node.mjs`

The suite checks every generator at every level (valid structure, clean
answers, unique multiple-choice options, deterministic from a seed), the
adaptive engine's promotion/demotion/mastery rules, and the curated schema.

## Tweaking it

- **Difficulty feel** — all the knobs (how fast it promotes/demotes, mastery
  threshold, how strongly weak topics are favoured) are named constants at the
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
js/generators/  _shared + 12 topic modules + index
js/ui/  router · components · screenHome · screenQuiz · screenTopics · screenParent
data/curated.json
tests/  test.html · harness · *.test.js · run-node.mjs
```
