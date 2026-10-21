# Curriculum and data design

Status: recommended architecture and draft content contract; not a complete approved curriculum.

## 1. Shared engine, separate curriculum packs

Keep UK 11+ and US elementary as separate versioned curriculum records. Both can use common renderers, generators, scheduling and persistence interfaces. Their skill expectations, placement rules, assessment interpretation and progress remain distinct.

Proposed identities:

- `uk-11plus`: existing product, with existing topic IDs retained.
- `us-elementary`: proposed multi-subject product, initially not selectable publicly.
- Subject IDs for new US content: `math`, `science`, `social-studies`.
- Skill IDs are stable semantic identifiers such as `us.math.fractions.unit-fraction`; curriculum version and grade mappings are separate fields.

Do not rename the legacy `syon11plus.v3` storage key or reinterpret its topic scores as US mastery. A new curriculum-aware layer should import legacy data into a UK scope through a tested migration and keep a recovery/export route.

## 2. Source-to-lesson traceability

For every published unit retain: source URL, standards edition/reference, objective, prerequisite skills, content/assessment links, reviewer status and revision history. State alignment is a reviewed mapping. A common skill may map to more than one state standard without duplicating its lesson content.

Use Common Core maths and NGSS science as candidate baselines; confirm mappings for the selected audience. Social studies needs a named state's content sequence. C3 is an inquiry-design reference, not a universal grade-level content list. See [primary sources](07-reference-sources.md).

Build an 18-cell coverage inventory if K–5 is selected: six grades × three subjects. Each cell should identify domains, included objectives, existing asset candidates, new material needed, reviewer and coverage status. Do not label a cell complete from a count of generated questions.

## 3. Representative Grade 3 slices

These demonstrate the architecture. Grade 3 and the social-studies reference state remain planning recommendations.

| Subject | Example slice | What must be authored/reviewed |
| --- | --- | --- |
| Math | Meaning of unit fractions and number-line representation | Equal-whole visuals, allowed values, independent checks, explanation of common errors |
| Science | Investigating balanced/unbalanced forces | Prediction, a controlled-variable activity, recorded observations and an explanation using evidence |
| Social studies | Comparing maps and community change | Authored/licensed maps and sources, clear geographic/time context, evidence-based questions and a rubric |

For Grade 3 fractions, the cited baseline limits denominators to 2, 3, 4, 6 and 8. Do not reuse unrestricted mixed-number/fraction-operation templates as Grade 3 material. [Common Core](https://www.thecorestandards.org/Math/Content/3/NF/)

NGSS `3-PS2-1` targets investigation of forces with specific assessment boundaries. A simulation or single MCQ can contribute evidence but does not by itself demonstrate the full investigation expectation. [NGSS](https://www.nextgenscience.org/pe/3-ps2-1-motion-and-stability-forces-and-interactions)

Social-studies sources should distinguish established facts, interpretations and learners' supported judgments. Do not grade agreement with an opinion as factual correctness. Document content rights and historical context.

## 4. Proposed skill contract

The JSON example demonstrates records, not a schema implementation. Use a versioned runtime schema and a validator in the eventual authoring pipeline. Reject unknown activity types, broken prerequisites, invalid standard references, and publication without required review metadata.

| Field | Purpose |
| --- | --- |
| `id`, `contentVersion` | Stable skill identity and reproducible revisions |
| `subject`, `gradeBand` | Curriculum navigation, not inferred learner ability |
| `objective`, `prerequisites` | Explicit teaching goal and sequence |
| `standardMappings` | Authority, reference, URL, mapping review status and extent of coverage |
| `representations`, `activityTypes` | Permitted ways to teach and elicit evidence |
| `constraints` | Numerical bounds, scientific assessment boundaries or source requirements |
| `misconceptions` | Hypotheses with diagnostic follow-up, not labels of the child |
| `evidencePolicy` | Distinguish assisted practice, independent performance and delayed review |
| `publicationStatus`, `reviews` | Draft/reviewed/published gating and named review evidence |

Draft skill records must not inflate published-coverage counts. Authoring status should be separate from a learner's progress status.

## 5. Subject-specific rendering and assessment

Shared interface proposal: render an activity from a validated content record, collect a typed response, evaluate with the activity's evaluator, and append an attempt event. Use exact or numeric checking only where the task supports it. An open explanation uses a rubric and can remain unscored or marked for review.

Activity families:

- Math: numeric response, MCQ, number line, area model, worked/faded steps.
- Science: predict/observe/explain, data table, model selection or construction, short rubric-based explanation.
- Social studies: map/timeline/source interpretation, ordering, comparison and supported short explanation.

When help is used, record that help. A correct answer after displaying the solution should not count as independent learning evidence. Keep assessment items and near-duplicates out of practice pools when evaluating learning gains.

## 6. Proposed progress model

Ownership scope: `parent account → learner ID → curriculum ID/version → skill ID`. IDs should be opaque; a child's name is a display preference, not a database key.

An attempt event should contain an idempotent event ID, scope, activity/template version, seed where appropriate, assessment mode, result, assistance, timestamps and an evidence-source label. Store raw learner answers only when necessary for an explicit feature and retention policy. Collect no unnecessary demographics.

Persist events and derive compact progress summaries. For cloud sync, deduplicate by event ID and enforce ownership server-side. Resolve concurrent events rather than blindly trusting a last-writer-wins whole-state overwrite. Define deletion/reset generations so an offline device cannot resurrect deleted data.

No learner/curriculum state migration is implemented by the foundation registry plan. It requires a separate reviewed migration and sync design after account/profile scope is chosen.

## 7. Content publication workflow

Draft → programmatic validation → subject review → held-out assessment review → preview → publish immutable version.

Use AI for drafting, variation, critique and test generation. Its agreement with another model does not constitute educator review. Quantitative questions need independent mathematical oracles; scientific/historical claims need source checking; open responses need explicit rubric boundaries.

When published content is corrected, retain the old version for interpreting past attempts, prevent it from being served, and decide explicitly whether affected mastery evidence needs review. Do not silently rewrite learner history.

## 8. Expansion and content operations

Measure the cost and review time of representative units in all three subjects before forecasting full K–5 delivery. Math template counts do not predict science or social-studies authoring throughput. Content maintenance is recurring work, including state changes, source corrections and accessibility review.

Port appropriate GCSE Prep patterns—structured lesson sections, diagrams and worked examples—without importing its secondary-level curriculum or creating a shared cross-repository dependency at this stage.
