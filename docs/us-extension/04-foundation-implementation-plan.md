# Brightspark Curriculum Foundation Implementation Plan

> **For agentic workers:** Use the executing-plans skill to implement this plan task by task. Use checkbox steps for tracking. Delegation is optional and requires applicable authorisation; this plan does not require subagents.

**Goal:** Correct a reproduced fraction-item ambiguity and introduce a tested curriculum registry while preserving the existing UK application.

**Architecture:** Retain the current JS modules and topic registry. Add curriculum metadata around the existing UK registry and a non-public US draft descriptor. No learner-state migration or public curriculum selector is included in this first increment.

**Tech Stack:** Existing native JavaScript ES modules, Node tests, existing browser test harness; no new runtime dependency.

**Spec:** [Scope](01-scope-and-decisions.md), [curriculum design](03-curriculum-and-data-design.md), and the task-specific contracts below.

## Global constraints

- Confirmed US subjects: math, science and social studies.
- Preserve existing UK routes, topic IDs, progress, storage key and access behaviour.
- Keep `syon11plus.v3` readable; this plan does not migrate its contents.
- Do not change `FREE_ERA`, production payment flags, domains or cloud resources in this increment.
- Planned US packs are hidden from normal curriculum listings.
- The new registry must not imply that US content or state alignment is published.
- Use existing code patterns; no framework migration or new runtime dependency.
- Do not treat question-template counts or passing code tests as educational validation.

This is a proposed, executable first increment. Reconcile it with the live repository and confirm the chosen direction in the destination session before editing. The broader product requires separate plans for learner state, subject renderers, content and hosting; their acceptance requirements are in the delivery document.

## Baseline and isolation

- [ ] Read repository instructions and inspect `git status --short` and `git log -5 --oneline`.
- [ ] Compare with reviewed commit `9d1d980ab37c823681627605443e8de5690e40e7`; adapt only where the current code differs.
- [ ] Create an isolated branch/worktree using the applicable worktree workflow; do not reset user changes.
- [ ] Run `node tests/run-node.mjs` from the root and `npm test` from `worker/`. Last observed results were 430/430 and 15/15. Count changes are acceptable if the current branch adds tests; explain failures before editing.

## Task 1: Make mixed-number addition options mathematically unambiguous

**Files:**

- Create: `tests/fraction-semantics.test.mjs`
- Modify: `js/generators/fractions.js`, template `mixed-add`

**Interfaces:**

- Consumes: `ALL_GENERATORS` from `js/generators/index.js`; `makeRng(seed)` from `js/rng.js`; existing `template.fn(level, rng)`.
- Produces: the same question shape and stable template/misconception IDs, with no equivalent-valued distractor for the unqualified addition question.

**Root cause:** The current `ma_no_carry` distractor preserves the entire fractional numerator, so it is equivalent to the correct answer whenever carrying occurs. The MCQ helper only deduplicates strings. Do not globally strip all equivalent values from every template: some questions explicitly assess simplest form. Fix the reproduced unqualified addition template first.

- [ ] **Step 1: Add independent semantic regression tests.**

Create `tests/fraction-semantics.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL_GENERATORS } from '../js/generators/index.js';
import { makeRng } from '../js/rng.js';

const template = ALL_GENERATORS
  .find(g => g.topicId === 'fractions').templates
  .find(t => t.id === 'mixed-add');

function rational(text) {
  const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(text);
  if (m) return [Number(m[1] || 0) * Number(m[3]) + Number(m[2]), Number(m[3])];
  assert.match(text, /^\d+$/);
  return [Number(text), 1];
}

function equal(a, b) {
  return a[0] * b[1] === b[0] * a[1];
}

function expectedValue(question) {
  const plain = question.promptHTML.replace(/<[^>]*>/g, '');
  const m = /^(\d+) (\d+)\/(\d+) \+ (\d+) (\d+)\/(\d+) = \?$/.exec(plain);
  assert.ok(m, `Unexpected prompt: ${plain}`);
  const a = rational(`${m[1]} ${m[2]}/${m[3]}`);
  const b = rational(`${m[4]} ${m[5]}/${m[6]}`);
  return [a[0] * b[1] + b[0] * a[1], a[1] * b[1]];
}

function check(question) {
  const expected = expectedValue(question);
  const equivalent = question.choices.filter(c => equal(rational(c.text), expected));
  assert.equal(equivalent.length, 1,
    `Ambiguous options for ${question.promptHTML}: ${JSON.stringify(question.choices)}`);
  assert.equal(equivalent[0].correct, true);
  assert.equal(question.choices.filter(c => c.correct).length, 1);
}

test('mixed-add level 2 seed 1 has one defensible numeric answer', () => {
  check(template.fn(2, makeRng(1)));
});

test('mixed-add preserves semantic uniqueness across its levels and sample seeds', () => {
  for (let level = 2; level <= 6; level++) {
    for (let seed = 1; seed <= 100; seed++) check(template.fn(level, makeRng(seed)));
  }
});
```

- [ ] **Step 2: Run the regression before editing the generator.**

Run: `node --test tests/fraction-semantics.test.mjs`

Expected on the reviewed baseline: failure because level 2/seed 1 has two equivalent-valued options. Confirm the failure is semantic, not an import/runtime error. If it already passes, inspect whether the bug was fixed; do not reapply the patch blindly.

- [ ] **Step 3: Change only the missing-carry distractor.**

After `correct` is computed in the template, add:

```js
const withoutCarry = rem ? `${w1 + w2} ${rem}/${d}` : String(w1 + w2);
```

Replace the `ma_no_carry` distractor with:

```js
{ text: withoutCarry, id: 'ma_no_carry',
  fb: `${totalN}/${d} contains a whole. Add that whole to the whole-number part.` },
```

When carrying is needed this option is genuinely one whole too small. When it is not needed, it equals the correct text and the existing helper removes it. Preserve other template IDs and behaviour.

- [ ] **Step 4: Run semantic and existing regressions.**

Run `node --test tests/fraction-semantics.test.mjs`, then `node tests/run-node.mjs`. Expected: both pass. Inspect representative carried/non-carried rendered questions and feedback. Record that this fixes one template, not the entire bank's educational accuracy.

- [ ] **Step 5: Commit only this tested change.**

```sh
git add js/generators/fractions.js tests/fraction-semantics.test.mjs
git commit -m "Fix equivalent-value distractor in mixed-number addition"
```

## Task 2: Add curriculum metadata without changing the live learning flow

**Files:**

- Create: `js/curricula/registry.js`
- Create: `tests/curricula.test.mjs`
- Modify: `README.md` to document the registry and native test command

**Interfaces:**

- Consumes: `TOPICS` and `SUBJECTS` from `js/topics.js`.
- Produces: `DEFAULT_CURRICULUM_ID`, `getCurriculum(id)`, and `listCurricula({ includePlanned = false } = {})`.
- Registry record fields: `id`, `label`, `status`, `subjects`, `gradeBands`, `legacyTopicIds`.
- `status` values in this increment: `published` and `planned`.
- `getCurriculum` returns a record or throws for an unknown ID; it must not silently fall back to UK.

- [ ] **Step 1: Add tests before the registry module exists.**

Create `tests/curricula.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, SUBJECTS } from '../js/topics.js';
import { DEFAULT_CURRICULUM_ID, getCurriculum, listCurricula } from '../js/curricula/registry.js';

test('normal listing exposes only the existing published UK curriculum', () => {
  assert.equal(DEFAULT_CURRICULUM_ID, 'uk-11plus');
  assert.deepEqual(listCurricula().map(p => p.id), ['uk-11plus']);
});

test('UK descriptor retains the existing subject and topic identities', () => {
  const uk = getCurriculum('uk-11plus');
  assert.equal(uk.status, 'published');
  assert.deepEqual(uk.subjects, SUBJECTS.map(s => s.id));
  assert.deepEqual(uk.legacyTopicIds, TOPICS.map(t => t.id));
});

test('US authoring metadata includes exactly the selected subjects and is planned', () => {
  const us = getCurriculum('us-elementary');
  assert.equal(us.status, 'planned');
  assert.deepEqual(us.subjects, ['math', 'science', 'social-studies']);
  assert.deepEqual(us.gradeBands, []);
  assert.deepEqual(us.legacyTopicIds, []);
  assert.equal(listCurricula({ includePlanned: true }).length, 2);
});

test('unknown curriculum identifiers are rejected', () => {
  assert.throws(() => getCurriculum('missing'), /Unknown curriculum/);
});
```

The empty US `gradeBands` is intentional: it contains no published grade coverage. Proposed K–5 content belongs in the draft authoring example until the release scope and reviewed content are established.

- [ ] **Step 2: Run the test and confirm the expected missing-module failure.**

Run: `node --test tests/curricula.test.mjs`

- [ ] **Step 3: Create the registry.**

Create `js/curricula/registry.js`:

```js
import { TOPICS, SUBJECTS } from '../topics.js';

export const DEFAULT_CURRICULUM_ID = 'uk-11plus';

function pack(record) {
  return Object.freeze({
    ...record,
    subjects: Object.freeze([...record.subjects]),
    gradeBands: Object.freeze([...record.gradeBands]),
    legacyTopicIds: Object.freeze([...record.legacyTopicIds]),
  });
}

const PACKS = Object.freeze([
  pack({
    id: 'uk-11plus', label: 'UK 11+ practice', status: 'published',
    subjects: SUBJECTS.map(s => s.id), gradeBands: [],
    legacyTopicIds: TOPICS.map(t => t.id),
  }),
  pack({
    id: 'us-elementary', label: 'US elementary', status: 'planned',
    subjects: ['math', 'science', 'social-studies'],
    gradeBands: [], legacyTopicIds: [],
  }),
]);

export function getCurriculum(id) {
  const result = PACKS.find(p => p.id === id);
  if (!result) throw new Error(`Unknown curriculum: ${id}`);
  return result;
}

export function listCurricula({ includePlanned = false } = {}) {
  return PACKS.filter(p => includePlanned || p.status === 'published');
}
```

Keep `js/main.js`, the storage key, learner state and production UI unchanged in this increment. Later consumers should explicitly resolve curriculum context through the registry; do not retrofit all imports at once.

- [ ] **Step 4: Add accurate README documentation.**

Append a section containing:

```markdown
## Curriculum foundation

`js/curricula/registry.js` describes the published UK curriculum and a
planned US elementary product covering math, science and social studies.
The US descriptor is authoring metadata only: it is not public content,
does not claim grade coverage, and does not change existing UK progress.

Run native semantic/registry tests with:

    node --test tests/fraction-semantics.test.mjs tests/curricula.test.mjs

Run the existing client regression suite with:

    node tests/run-node.mjs
```

- [ ] **Step 5: Verify the increment and commit.**

Run both commands above and `git diff --check`. Open existing Home, Topics, Review, Mock, Parent and Account views locally; confirm no new US selector appears and existing progress still loads. Run `npm test` in `worker/` to confirm the unchanged backend suite still passes.

```sh
git add js/curricula/registry.js tests/curricula.test.mjs README.md
git commit -m "Introduce non-disruptive curriculum registry"
```

## Completion report

Report actual test results, changed files and any deviation from this plan. Explicitly state that this increment does not deliver US lessons, learner-profile isolation, cloud sync, full curriculum alignment or commercial launch. Proceed to the next design milestone in [delivery and validation](05-delivery-and-validation.md), using the founder's resolved decisions.
