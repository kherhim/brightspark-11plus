# Brightspark Prep — Project Status

_Last updated: 2026-11-15_

Living status doc. The economic rationale lives in the **private** (gitignored)
`ECONOMICS.md`; this file is the operational state.

## What it is

Local-first UK 11+ practice web app (Maths · Verbal Reasoning · Non-Verbal
Reasoning · English). **Free for everyone** — every subject and feature, no
account and no payment. Optional free accounts provide passwordless sign-in;
learning progress remains browser-local. **All payment functionality has been
removed** (November 2026): the site and backend cannot take money. The removed
code is archived at git tag `payments-archive-2026-11`.

## Live

- **Site (GitHub Pages, custom domain):** https://brightsparkprep.com/
  (landing `index.html`, app `app.html`, `privacy.html`, `terms.html`)
  Old URL https://kherhim.github.io/brightspark-11plus/ auto-redirects.
- **Backend (Cloudflare Worker):**
  https://brightspark-worker-production.brightspark.workers.dev
- **Repo:** public (`kherhim/brightspark-11plus`). Pages is deployed by
  GitHub Actions from the built `dist/` directory on each merge to `main`;
  the repository root is no longer served.
- **Domain registrar:** Cloudflare Registrar (apex `brightsparkprep.com`,
  www CNAME → apex). DNS managed at Cloudflare.

## Architecture

- Static SPA (HTML/CSS/ES modules; no build needed in development, a
  bundling/minifying production build in `scripts/build-site.mjs`), local-first (localStorage,
  schema v4). Progress stays on the device; the Worker supplies public access
  configuration and optional parent authentication.
- Minimal backend: Cloudflare Worker + D1 (SQLite) — passwordless
  magic-link auth only. There are no payment routes (`/checkout` and
  `/stripe/webhook` return 404). Staging and production now use separate
  databases. Magic links are consumed atomically in D1, sessions are
  environment-bound, and KV is no longer used.
- **No gating:** the client has no paywall, plan list, checkout call or
  daily cap; `js/entitlement.js` only caches the signed-in account for the
  Account screen. The Worker's `/config` still returns `freeEra: true`
  (hard-coded) so older cached clients stay unlocked; it no longer returns
  `paymentsEnabled` or `plans`.
- Payments: **none**. The `entitlements`, `stripe_events` and
  `checkout_fulfillments` D1 tables are retained with their data (dropping
  them is a separate decision). Secrets live only in the operator's macOS
  Keychain / `wrangler secret`.
- Transactional email: **Resend** (eu-west-1), verified domain
  `brightsparkprep.com` (DKIM/SPF/MX live), sender
  `Brightspark Prep <no-reply@brightsparkprep.com>`.

## Access model

- **Everything free:** all 4 subjects + mock exams + smart review + readiness
  analytics + worksheets, no daily cap — for everyone, no account, no payment.
  This is the only access model; the restricted tier was removed.
- **Accounts:** optional and free; magic-link sign-in; progress sync is not
  implemented.

## Stage status

| Stage | State |
|---|---|
| Phases 1–4A (4 subjects, mocks, review, analytics, worksheets) | ✅ shipped |
| Stage A — landing + funnel scaffold | ✅ |
| Stage B — backend (magic-link auth + entitlement + Stripe) | ✅ built, payments dormant |
| C1–C5 — D1/KV, Worker deploy, Stripe setup, frontend cutover, E2E test | ✅ (test-mode purchase E2E passed) |
| Custom domain + Resend + rebrand (was "C6") | ✅ live |
| **Free-for-all — open the gate** | ✅ **live** (PR #1 merged + deployed 2026-05-22) |
| **Payments removed** (archived at tag `payments-archive-2026-11`) | ✅ in code; Worker redeploy pending |

Current test state: client **426/426**, DOM/import security + build **36/36**,
Worker **59/59** green. Both dependency audits report zero known vulnerabilities.

## Free-for-all launch

Direction (2026-05-22): the whole product is free for everyone for the
launch period (operator's plan: at least the first 100 days), signups
optional, then monetise.

- **Open the gate** — ✅ **live** (PR #1, deployed 2026-05-22).
  `fullAccess()` / `freeEra()` gate, `FREE_ERA` flag, landing page
  de-priced, `privacy.html` / `terms.html` aligned to free + optional
  accounts (version and `CONSENT_VERSION` bumped to 2026-05-22).
- **User analytics / benchmarking** — explored 2026-05-22 (anonymous
  cohort percentiles, e.g. "top 1%" by topic/subtopic) and **shelved**
  at the operator's call; not being built for now.

## Payments removed (November 2026)

All payment functionality was removed rather than feature-flagged, so it is
structurally impossible to pay through the site or backend. The removed code
(Worker checkout/webhook routes, Stripe signature verification, price mapping,
client checkout and paywall UI, pricing copy) is archived at git tag
**`payments-archive-2026-11`**.

- Worker: `POST /checkout` and `POST /stripe/webhook` return 404. `/config`
  has no `paymentsEnabled` or `plans`. `wrangler.toml` has no
  `PAYMENTS_ENABLED`, `STRIPE_LIVE_MODE`, `PRICE_*`, `ACCESS_DAYS_*`,
  `FAMILY_SEATS` or `FREE_ERA`, and `scripts/check-config.mjs` now rejects
  any `STRIPE_*`, `PRICE_*` or `PAYMENTS_*` variable.
- Data: no migration was added and no tables were dropped.
- Manual follow-ups (not done in code): redeploy the Worker
  (`npm run deploy:prod` from `worker/`); delete the `STRIPE_SECRET` /
  `STRIPE_WEBHOOK_SECRET` Worker secrets and the Stripe webhook endpoints;
  decide whether to keep or drop the retained payment tables.

## Current safety state

- Until the Worker is redeployed, the live Worker still runs the old code
  with `PAYMENTS_ENABLED="false"` (`/checkout` returns 403). After redeploy
  the payment routes no longer exist.

## Free-for-all — deployed

Original free-era rollout: 2026-05-22 (Pages build `cadeb8c`; Worker version `1cbf2e46`).
Still recommended:

- [x] Static site (Pages) — free-for-all live.
- [x] Worker redeploy — `/config` now serves `freeEra:true` and
      `consentVersion:2026-05-22`.
- [ ] (Recommended) ICO data-protection registration — the backend
      processes parent emails for optional accounts.
- [ ] (Recommended) brief UK consumer-lawyer sense-check of
      `privacy.html` / `terms.html`.

## Deferred / future

- Payments are removed. Restoring them would start from the
  `payments-archive-2026-11` tag and need fresh legal copy and review.
- Progress cloud-sync, benchmarking/cohorts, AI essay marking, age-range
  expansion (KS2 SATs / 7+–8+ / 13+ — the long-term LTV play in `ECONOMICS.md`).

## Operational notes

- Secrets in macOS Keychain (`security find-generic-password -s <NAME> -w`):
  `CLOUDFLARE_API_TOKEN` (the old `STRIPE_TEST_KEY` / `STRIPE_WHSEC` entries
  are no longer used by the code and can be deleted). Never in
  repo/chat/`wrangler.toml`. Resend API key is in `wrangler secret` only
  (`EMAIL_API_KEY` on env.production).
- Commits: author `kherhim` (NOT the work email). Outward-facing actions
  (push, prod deploy) are confirmed before execution.
- Tests: client `npm test` (logic, security, production build); Worker
  `cd worker && npm test`. CI runs both on every pull request.
- Domain DNS: Cloudflare (Registrar + DNS). GitHub Pages records (4 apex
  A + www CNAME) are **DNS only** (grey cloud), so GitHub provisions its
  own Let's Encrypt cert. Resend records (DKIM TXT at `resend._domainkey`,
  SPF TXT + MX at `send`) are TXT/MX (no proxy concept).

## September 2026 security rollout

_Historical record; the payment items below predate the November 2026
removal._

PR #2 carries fixes for HTML injection/import validation, environment
isolation, single-use expiring links, mail abuse limits, development dependency
vulnerabilities and paid-only transactional Stripe fulfilment. Its merge
publishes the frontend through GitHub Pages.

- Dedicated staging site: https://brightspark-staging-site.brightspark.workers.dev
- Dedicated staging API: https://brightspark-worker-staging.brightspark.workers.dev
- Live staging email sign-in, reuse rejection, concurrent redemption, Stripe
  test Checkout/webhook and environment-isolation checks passed.
- Production D1 was backed up and the export restore-checked before migration
  `0002_security.sql`. Restricted backups are excluded from Git.
- Production Worker `044a7c77-b198-4220-a5ec-1e87fd62f904` is deployed;
  `PAYMENTS_ENABLED=false`, `FREE_ERA=true`, and no KV binding.
- Existing parent sessions and previously issued magic links are invalidated;
  sign in again. Browser learning progress is preserved.
- Historical test-mode entitlement evidence was recorded privately. The record
  was preserved and needs reconciliation before a paid launch. Two obsolete
  test webhooks targeting production were disabled.

See `worker/README.md` for deployment and verification commands.

## October 2026 — controlled production build (items 7 and 8)

- **7. Controlled publish:** GitHub Actions (`.github/workflows/pages.yml`)
  runs the client and Worker tests, builds `dist/` with
  `scripts/build-site.mjs` and deploys only that directory. The build has an
  allowlist (four HTML pages, `CNAME`, `style.css`, `js/main.js`,
  `data/*.json`) and fails if anything else appears. Docs, tests, the Worker,
  `STATUS.md`, `package*.json` etc. are no longer publicly served. The staging
  site uses the same build with only the API base swapped. `.nojekyll` is not
  needed by an Actions deploy and is not published.
- **8. Minification (measured, no lazy-loading):** esbuild (pinned 0.25.10)
  bundles the 66 ES modules into one minified `js/main.js` (no dynamic
  imports exist, so this is not code splitting) and minifies CSS and JSON.
  HTML is left as written. First load of `app.html`:

  | Asset | Before | After |
  | --- | --- | --- |
  | JavaScript | 66 requests · 350.2 KB · 120.6 KB gzip | 1 request · 205.8 KB · 62.9 KB gzip |
  | CSS | 12.4 KB · 3.5 KB gzip | 9.2 KB · 2.6 KB gzip |
  | Data (2 JSON) | 40.4 KB · 11.2 KB gzip | 35.5 KB · 11.0 KB gzip |

  Total transfer roughly halves (135 → 77 KB gzip) and the 66-step module
  waterfall becomes one request. At ~77 KB compressed, lazy-loading or code
  splitting is not justified; revisit only if the bundle grows substantially.
- Development is unchanged: serving the repo root still loads the source
  modules directly with no build step.
- Dependency audit fixes made alongside: `source-map-js` (via jsdom) and
  Worker dev tooling (`wrangler`/`miniflare`/`undici`/`sharp`) — both audits
  report zero known vulnerabilities; 430 client + 36 security/build + 64 Worker
  tests pass.
- Rollback (emergency): `gh api -X PUT repos/kherhim/brightspark-11plus/pages
  -f build_type=legacy -f 'source[branch]=main' -f 'source[path]=/'` restores
  root serving from `main`.
