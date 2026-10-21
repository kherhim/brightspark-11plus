# Delivery milestones and acceptance criteria

This is a roadmap of separately specifiable increments. Only the first bounded implementation plan is included in this pack. Full K–5 delivery timing is not established; measure authoring and review throughput first.

## Milestone 0 — reconcile reality and public promises

Deliver: semantic regression coverage for the reproduced fraction ambiguity; accurate local-only progress messaging; updated repository capability notes.

Inspect these known copy locations: `index.html`, `js/ui/screenAccount.js`, `js/ui/screenSignup.js`, `privacy.html`, `README.md` and `STATUS.md`. The current Worker supplies accounts and entitlements, not progress sync.

Recommended interim wording: “Practice progress is saved in this browser. Use Export and Import on the Parent page to move it. Signing in does not currently sync learning progress.” Describe public configuration requests accurately; do not claim the app makes zero network requests.

Acceptance: all public/UI descriptions match implemented behaviour; historical status entries are identified as historical; privacy statements reflect actual requests and records. Review legal-policy edits for accuracy rather than blindly replacing words.

## Milestone 1 — curriculum contract and coverage map

Deliver: registry, reviewed schema, K–5 coverage inventory if selected, first-grade scope and a reference-state decision.

Acceptance: UK IDs/state unchanged; draft packs hidden; all three confirmed subjects represented; no duplicate skill IDs or broken prerequisites; each alignment claim links to a source and mapping review; full/partial coverage distinction is visible.

## Milestone 2 — learner context and persistence

Deliver: parent/learner separation and curriculum-scoped local progress; cloud sync only if explicitly included in this milestone.

Acceptance tests must cover:

- Existing legacy exports import without losing attempts, review queues or settings.
- Two learners sharing a browser remain isolated.
- UK and US progress never silently combine.
- Concurrent/offline attempts merge once, using stable event IDs.
- A late response cannot write into a different active learner/account.
- Resets/deletions cannot be undone by stale clients.
- Export/import and recovery remain available and tested.
- If cloud sync is offered: authenticated ownership checks on every request, cross-device proof, clear unsaved/offline indicators, retention/deletion rules and independently isolated staging resources.

Do not equate local names or billing seat counts with this implemented profile model. Do not put authoritative progress into eventually consistent KV.

## Milestone 3 — representative subject experiences

Deliver one reviewed unit in each subject to establish the reusable activity types and authoring cost.

| Subject | Software checks | Educational checks |
| --- | --- | --- |
| Math | Independent numeric oracle; equivalent forms; bounds; diagram consistency; unique defensible choices | Explanation develops the target concept; transfer across representations |
| Science | Data/simulation invariants; stable observations; response capture; rubric handling | Relevant ideas, practices and crosscutting concepts work together; partial evidence is labelled |
| Social studies | Source links/rights metadata; map/timeline consistency; accepted response/rubric paths | Factual accuracy, source context, multiple supported explanations and appropriate reading demand |

Use exact grading only where justified. A model may assist with open-response feedback, but uncertain results must remain uncertain and not become a zero or silently awarded mastery.

## Milestone 4 — coherent first-grade product

Deliver: a navigable sequence across the agreed three subjects, placement, practice/review and a parent dashboard, with exact published coverage.

Acceptance: the child can complete a session independently where intended; keyboard/touch and essential accessibility flows work; parent can distinguish observed learning from hints and practice; missed answers trigger appropriate remediation; grading failures preserve the response and do not corrupt progress.

Additional subjects and units are content/versioned capabilities, not global conditionals scattered across every screen. No claim of complete grade coverage until the standards inventory and educator review support it.

## Milestone 5 — commercial hosting and operations

Deliver: commercial-appropriate static hosting, staged rollout, environment separation, tested accounts/payment configuration, cost visibility and support procedures.

Acceptance:

- Staging and production use distinct data, email/payment configuration and secrets.
- Static asset deployment exposes only intended public files.
- Cached authenticated responses cannot leak across users.
- Billing entitlement changes are server-validated and webhook retries are idempotent.
- Authoritative authentication/token operations have required atomicity.
- Backup/restore and rollback are exercised with test data.
- AI requests, if present, have authentication, quotas, cost monitoring and graceful fallback.
- Consent, parent access, deletion and retention match the deployed product.

Production deploys, DNS changes and live billing are separate operational actions; this documentation pack does not perform them.

## Milestone 6 — external learning and commercial pilot

Recruit a small cohort matching the chosen grade and geography. The earlier 15–25-family suggestion is a feasibility cohort, not a powered effectiveness study.

Track activation, independent use, adult assistance, held-out performance, delayed retention where feasible, payment, completion, dissatisfaction and support effort. Report results separately by subject. Do not conflate a maths result with proof that social-studies instruction works.

Commercial gates: actual payments, a credible repeatable acquisition route, manageable support costs and a clear reason to choose Brightspark over existing resources. Educational gates: accurate content, useful independent learning evidence and an explicit plan for stronger evaluation before strong efficacy claims.

## Test-tooling recommendation

Retain the current harness and Worker tests. Use native Node tests for new file/system-level contracts, add browser smoke/E2E coverage with synthetic accounts, and run all maintained suites in CI. The existing browser-only curated tests should remain in the release process; the Node suite alone does not cover them.

Add runtime content validation before publication and incremental static checking on new modules. Test behaviour that can fail meaningfully: migrations, isolation, duplicate events, equivalent answers, malformed content and model failure. Avoid hundreds of tests that only restate content fields.

## Suggested division of effort

The founder owns product, customer learning, core engineering and release decisions. AI assists authoring, implementation, test generation and analysis. Paid educators review bounded subject batches; security/privacy/evaluation specialists address clearly scoped needs. No permanent headcount is assumed, but specialist work and founder support time must be costed.
