# Brightspark Prep — Project Status

_Last updated: 2026-09-23_

Living status doc. The economic rationale lives in the **private** (gitignored)
`ECONOMICS.md`; this file is the operational state.

## What it is

Local-first UK 11+ practice web app (Maths · Verbal Reasoning · Non-Verbal
Reasoning · English). **Currently free for everyone** — every subject and
feature, no account and no payment — for the launch period (operator's plan:
free for at least the first 100 days, then monetise). Optional free accounts
provide passwordless sign-in; learning progress remains browser-local. The monetisation path (one-off paid access; ~£20k/month
profit goal — see `ECONOMICS.md`) is fully built and **dormant**, ready to
switch on later.

## Live

- **Site (GitHub Pages, custom domain):** https://brightsparkprep.com/
  (landing `index.html`, app `app.html`, `privacy.html`, `terms.html`)
  Old URL https://kherhim.github.io/brightspark-11plus/ auto-redirects.
- **Backend (Cloudflare Worker):**
  https://brightspark-worker-production.brightspark.workers.dev
- **Repo:** public (`kherhim/brightspark-11plus`); Pages serves `main`.
- **Domain registrar:** Cloudflare Registrar (apex `brightsparkprep.com`,
  www CNAME → apex). DNS managed at Cloudflare.

## Architecture

- Zero-build static SPA (HTML/CSS/ES modules), local-first (localStorage,
  schema v4). Progress stays on the device; the Worker supplies public access
  configuration and optional parent authentication.
- Minimal backend: Cloudflare Worker + D1 (SQLite) — passwordless
  magic-link auth, server-verified entitlement, Stripe Checkout + webhook
  (the payment paths are dormant). Staging and production now use separate
  databases. Magic links are consumed atomically in D1, sessions are
  environment-bound, and KV is no longer used.
- **Free-for-all gate:** `js/entitlement.js` `fullAccess()` =
  `isPaid() || freeEra()` is the single check the UI gates on. `freeEra()`
  (`js/config.js`) reads the Worker `/config` and **fails open** — a Worker
  blip can never downgrade users to the restricted tier. Driven by
  `FREE_ERA="true"` in `wrangler.toml`. `isPaid()` is kept narrower
  ("this account paid") for the Account screen and post-era analytics.
- Payments: Stripe (test mode), `PAYMENTS_ENABLED="false"`. We never see card
  data. Secrets live only in the operator's macOS Keychain / `wrangler secret`.
- Transactional email: **Resend** (eu-west-1), verified domain
  `brightsparkprep.com` (DKIM/SPF/MX live), sender
  `Brightspark Prep <no-reply@brightsparkprep.com>`.

## Access model

- **Free era (now):** all 4 subjects + mock exams + smart review + readiness
  analytics + worksheets, no daily cap — for everyone, no account, no payment.
- **Accounts:** optional and free; magic-link sign-in; accounts identify parent access;
  progress sync is not implemented.
- **Restricted tier (dormant):** when `FREE_ERA` is flipped off (the future
  monetisation launch), free reverts to Maths + a daily question cap and the
  rest becomes paid. That gating copy/machinery is intact in the code but
  currently unreachable.

## Stage status

| Stage | State |
|---|---|
| Phases 1–4A (4 subjects, mocks, review, analytics, worksheets) | ✅ shipped |
| Stage A — landing + funnel scaffold | ✅ |
| Stage B — backend (magic-link auth + entitlement + Stripe) | ✅ built, payments dormant |
| C1–C5 — D1/KV, Worker deploy, Stripe setup, frontend cutover, E2E test | ✅ (test-mode purchase E2E passed) |
| Custom domain + Resend + rebrand (was "C6") | ✅ live |
| **Free-for-all — open the gate** | ✅ **live** (PR #1 merged + deployed 2026-05-22) |

Current test state: existing client **430/430**, DOM/import security **30/30**,
Worker **64/64** green. Both dependency audits report zero known vulnerabilities.

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

## Pricing (dormant — for the eventual monetisation)

Locked in Stripe (Price amounts are immutable); switched on only when the
free era ends:

| Plan | Price (one-off, GBP) | Access | Seats |
|---|---|---|---|
| Annual | £29 | 12 months (365 d) | 1 |
| 11+ Access | £34 | ~3 years (1095 d) | 1 |
| Family | £49 | ~3 years (1095 d) | up to 3 |

## Current safety state

- `PAYMENTS_ENABLED="false"` in `wrangler.toml` and live on the deployed
  Worker (`/config` confirms). `/checkout` returns 403 — charging is
  impossible until a deliberate launch flip.
- `FREE_ERA="true"` in `wrangler.toml` and live on the deployed Worker —
  `/config` returns `freeEra:true`. The static site is deployed and
  free-for-all is **live**. To end the era later, flip `FREE_ERA` off
  (Worker) **and** `FREE_ERA_DEFAULT` in `js/config.js`.

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

## Deferred / future monetisation

- **Ending the free era:** flip `FREE_ERA="false"` (Worker) **and**
  `FREE_ERA_DEFAULT=false` (`js/config.js`), then the original payment-launch
  checklist — ICO registration, Stripe account activation, Stripe Tax,
  test→live Stripe key swap, flip `PAYMENTS_ENABLED="true"`.
- Progress cloud-sync, benchmarking/cohorts, AI essay marking, age-range
  expansion (KS2 SATs / 7+–8+ / 13+ — the long-term LTV play in `ECONOMICS.md`).

## Operational notes

- Secrets in macOS Keychain (`security find-generic-password -s <NAME> -w`):
  `CLOUDFLARE_API_TOKEN`, `STRIPE_TEST_KEY`, `STRIPE_WHSEC`. Never in
  repo/chat/`wrangler.toml`. Resend API key is in `wrangler secret` only
  (`EMAIL_API_KEY` on env.production).
- Commits: author `kherhim` (NOT the work email). Outward-facing actions
  (push, prod deploy) are confirmed before execution.
- Tests: client `node tests/run-node.mjs`; Worker `cd worker && npm test`.
- Domain DNS: Cloudflare (Registrar + DNS). GitHub Pages records (4 apex
  A + www CNAME) are **DNS only** (grey cloud), so GitHub provisions its
  own Let's Encrypt cert. Resend records (DKIM TXT at `resend._domainkey`,
  SPF TXT + MX at `send`) are TXT/MX (no proxy concept).

## September 2026 security rollout

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
