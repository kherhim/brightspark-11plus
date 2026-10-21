# Stack and repository assessment

## Verdict

**The stack is adequate for a serious first commercial product, provided its current gaps are addressed.** The main bottlenecks are curriculum modelling, content reliability, learner data and distribution. None requires a wholesale frontend rewrite.

| Layer | Current implementation | Recommendation |
| --- | --- | --- |
| Frontend | HTML/CSS, native JavaScript ES modules, direct DOM rendering | Keep for the first extension; extract shared, accessible activity components |
| Learning engine | Pure JS generators, adaptation, review and analytics | Keep and separate curriculum rules from reusable mechanics |
| Types/content contracts | JS objects and modest runtime validation | Add explicit schemas and JSDoc/type checks incrementally; consider TypeScript for new complex modules |
| Build tooling | Zero-build static site | Add a small build tool only when bundling, typed modules or content splitting needs it; Vite is a reasonable candidate, not a prerequisite |
| Frontend hosting | GitHub Pages | Move the commercial product to suitable hosting; Workers Static Assets fits the existing Cloudflare stack |
| API | Cloudflare Worker | Keep; introduce route/service boundaries as responsibilities expand |
| Relational storage | D1 for accounts, sessions and entitlements | Reasonable pilot option for scoped learner/event records after concurrency and access design |
| KV | Tokens and rate-limit-related data | Audit consistency-sensitive uses; keep cache/config roles distinct from authoritative state |
| Progress | Browser localStorage adapter | Preserve legacy data; add a real cloud adapter only with conflict, offline and isolation tests |
| Billing/email | Stripe/Resend integration, payments currently configured dormant | Keep the integrations; verify live-mode readiness separately |
| Tests | Dependency-free client harness; Node Worker tests | Keep; add semantic item tests, browser flows, schema checks and CI |

### A hosting change is justified

GitHub Pages explicitly excludes use as free hosting for a commercial SaaS/online-business site. This is a fit issue for the intended commercial product, not a claim that today's free site must be taken down. Cloudflare Workers can serve static frontend files and API code in one deployment. GitHub can remain the source repository. [GitHub limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)

Plan and test routes, caching, custom domain, assets, authentication redirects and rollback before moving production. Keep public learning content cacheable; authenticated responses require appropriate cache controls. Do not expose repository files, development configuration or secrets as static assets.

### D1 is reasonable, not unlimited

Cloudflare documents a 10 GB per-database limit on paid D1 and serial query processing within a database. Those are design constraints, not a reason to migrate pre-emptively. Store compact attempt events, index learner/curriculum queries, measure query latency and write load, and define retention. Avoid repeatedly overwriting a growing whole-progress blob. Revisit storage if measured workload or data requirements justify it. [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)

### KV is not a transactional progress store

Cloudflare documents eventual consistency and advises against KV for atomic read/modify/write needs. Do not use it as authoritative mastery, payment entitlement or merge state. Review current token consumption and rate-limit operations for required atomicity; this pack does not claim an exploit was demonstrated. Use a suitable transactional/serialised design where required. [KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/)

### Environment isolation needs attention

The inspected `worker/wrangler.toml` explicitly describes shared staging/production D1 and KV infrastructure. Separate resources before multi-family production testing or real payments. Keep test email, billing keys, webhook configuration and data isolated. Do not copy production data into development as a default test fixture.

## When a framework change would be justified

Consider a component framework if complex interactive state, accessibility or repeated UI changes become demonstrably costly. Adopt it incrementally around a new subject experience rather than rewriting working learning logic. Framework choice does not validate a curriculum, solve cloud sync, or establish a moat.

A typed content contract is a higher immediate priority than changing UI frameworks. Render structured content safely; historical/source material and AI drafts should not become unrestricted HTML.

## Repository orientation

| Path | Responsibility |
| --- | --- |
| `js/topics.js`, `js/boards.js` | UK subjects, broad topics and exam settings |
| `js/generators/` | Seeded question templates; shared mathematical/SVG helpers |
| `js/questionFactory.js` | Generator/curated selection, identifiers and fresh variants |
| `js/engine.js`, `js/review.js`, `js/fixits.js` | Adaptive ladder, review queue and targeted explanations |
| `js/analytics.js` | Heuristic readiness and pace summaries |
| `js/store.js`, `js/persistence/` | Legacy schema, migration and local-only adapter |
| `js/ui/`, `js/main.js` | Screens, routing and bootstrap |
| `js/auth.js`, `js/entitlement.js`, `js/config.js` | Accounts, UI access state and public configuration |
| `worker/src/index.js`, `worker/src/lib.js` | Account/session/billing API and helpers |
| `worker/migrations/0001_init.sql` | Accounts, sessions, entitlements and webhook deduplication |
| `tests/`, `worker/test/` | Existing regression suites |

## Reviewed baseline and confirmed gaps

Baseline commit: `9d1d980ab37c823681627605443e8de5690e40e7`; working tree was clean when inspected. Tests ran on local Node `v25.9.0`; that observation is not a recommendation to standardise on that release. Choose a supported Node LTS for development/CI and verify compatibility.

- 430 client checks and 15 Worker tests passed in the earlier review.
- Core practice is deterministic, not a runtime-LLM product.
- The live parent page showed 914 generated forms plus 58 curated problems. The displayed estimate of variants uses `forms × 15 + curated`, not an exhaustive uniqueness count.
- Cross-device progress is promised in landing/account text, but `activeAdapter` is local-only and the Worker has no progress API.
- `mixed-add`, level 2, seed 1 asks `1 5/6 + 4 5/6 = ?`; it marks `6 4/6` correct and equivalent-valued `5 10/6` wrong without specifying the required form.
- “Exam-ready” and mastery are programmed heuristics, not calibrated external predictions.
- The existing parent-name field and entitlement seat count do not establish multiple separately permissioned learner profiles.

These are bounded review findings, not an exhaustive audit. Recheck them against the working branch before implementation. No production changes or paid AI calls were made during the review.
