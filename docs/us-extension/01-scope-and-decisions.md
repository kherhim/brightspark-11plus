# Scope and decisions

## Confirmed by the founder

- Target market: United States.
- Product: broader elementary learning built from Brightspark Prep (`forSyon`).
- Subjects: **math, science and social studies**.
- Company model: one founder using AI, with venture backing and an ambition to build a large business.
- Existing UK product and its learning assets are valuable starting points.
- Planning/building should take place in the Brightspark repository; market research remains separate.

Reading and writing support the selected subjects; a standalone ELA curriculum is not selected. The India cold-chain idea is unrelated. Earlier fractions-only suggestions were superseded as the product scope, although fractions remains a useful representative unit.

## Recommended design defaults to ratify

| Decision | Recommendation | Reason |
| --- | --- | --- |
| Grade span | K–5 product architecture | A concrete elementary boundary; full coverage is a substantial content programme |
| First delivery grade | Grade 3 across the three subjects | Existing maths assets and independent-reading assumptions may make it a practical starting cohort; validate with educators |
| Buyer | Parent first; small tutoring/learning providers as a parallel discovery channel | Avoid assuming school procurement is the fastest launch route |
| Standards | Named Common Core maths baseline, NGSS science baseline, named-state social studies sequence | Explicit scope is more defensible than an “all US curricula” claim |
| Social studies reference | California as a research candidate, not a committed nationwide sequence | Official grade-level frameworks are accessible; pilot geography should decide |
| Architecture | Shared core, separate curriculum/version packs | Reuse without conflating UK/US learner evidence |
| Runtime AI | Bounded optional support after deterministic/authored baseline | Measure value, quality and delivery cost before making it essential |
| Pilot persistence | Choose explicitly between honest local-only use and fully tested cloud sync | Existing accounts do not sync progress |

Choosing these defaults should be a short product decision, not a reason to restart market research. If the founder chooses another grade or state, update the relevant pack; do not discard the reusable engine.

## Product promise

“Understand what your child is learning, identify where they need help, and give them a useful next activity.” This is proposed positioning, not a promise of guaranteed score improvement.

The product should contain a coherent teaching sequence, not just standards-tagged quizzes. Initial coverage must be explicit: published, partial, in review or not yet offered. Never display an unbuilt grade as fully available.

## First-release requirements

1. A curriculum and grade selector that only offers reviewed, published packs.
2. Separate learner and curriculum progress, with safe migration of existing UK state.
3. Subject-appropriate lessons, activities, feedback and independent checks.
4. Placement based on limited evidence with an “unknown” state, not a blanket level-3 start.
5. A parent view distinguishing practice, help received, independent performance and review due.
6. A low-friction reporting route for incorrect questions or feedback.
7. Accurate access, persistence, privacy and pricing descriptions.
8. A documented content-review process and measured support/compute cost.

## Non-goals for the first release

No full nationwide alignment claim; no full K–5 content promise before review; no automated diagnosis of learning disabilities; no guaranteed grades; no unrestricted child chatbot; no copying GCSE content wholesale into elementary science; no forced merger with GCSE Prep.

The broader product can be released by grade and reviewed units. That sequence preserves the founder's broad ambition while keeping each delivery increment testable.

## Key economic questions

The original US tutoring TAM concerned literacy/numeracy. It cannot be multiplied by three because three subjects are now included: the same families may purchase one bundle. Rebuild pricing and market sizing around the new buyer, coverage and bundle after pilot interviews.

Measure willingness to pay, acquisition effort, learning progress, completion, renewal and support time. An existing question bank demonstrates implementation capability, not product-market fit.
