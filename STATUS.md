# Brightspark Prep — Project Status

_Last updated: 2026-05-22_

Living status doc. The economic rationale lives in the **private** (gitignored)
`ECONOMICS.md`; this file is the operational state.

## What it is

Local-first UK 11+ practice web app (Maths · Verbal Reasoning · Non-Verbal
Reasoning · English). **Currently free for everyone** — every subject and
feature, no account and no payment — for the launch period (operator's plan:
free for at least the first 100 days, then monetise). Optional free accounts
add cross-device sync. The monetisation path (one-off paid access; ~£20k/month
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
  schema v4). Used **without an account the app makes zero backend calls** —
  nothing leaves the device.
- Minimal backend: Cloudflare Worker + D1 (SQLite) + KV — passwordless
  magic-link auth, server-verified entitlement, Stripe Checkout + webhook
  (the payment paths are dormant). Single shared D1+KV across envs for now
  (split before real scale).
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
- **Accounts:** optional and free; magic-link sign-in; the only benefit is
  cross-device progress sync.
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
| **Free-for-all Step 1 — open the gate** | ✅ built, tests green, **not yet deployed** |

Current test state: client **430/430**, Worker **15/15** green.

## Free-for-all launch — the 3-step plan

Direction (2026-05-22): free for everyone for the launch period, signups
optional, then monetise. Agreed plan:

1. **Open the gate** — ✅ **done** (built on branch, not yet deployed).
   `fullAccess()`/`freeEra()` gate, `FREE_ERA` flag, landing page de-priced,
   `privacy.html`/`terms.html` aligned to free + optional accounts (version
   and `CONSENT_VERSION` bumped to 2026-05-22).
2. **Anonymous analytics** — planned. Aggregate, non-account-linked usage
   events; new Worker endpoint + D1 table; `privacy.html` rewrite + ICO
   registration. Optional signup builds an email list for the day-100
   conversion. Open decisions: provider (first-party vs Plausible/Cloudflare),
   and the true-anonymity vs retention-measurement trade-off.
3. **Benchmarking** — deferred. Anonymous cohort percentiles shown to parents;
   needs a user base first.

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
- `FREE_ERA="true"` in `wrangler.toml` (not yet on the deployed Worker — but
  the client fails open, so free-for-all is the effective state the moment
  the static site ships).

## Deploying free-for-all (Step 1)

No code blockers. When ready:

- [ ] Deploy the static site (Pages) — turns free-for-all on immediately
      (client fails open).
- [ ] Redeploy the Worker (`npm run deploy:prod`) — adds the `FREE_ERA`
      server flag (the kill switch to end the era later) and the
      `CONSENT_VERSION` bump.
- [ ] Verify: all 4 subjects + mocks + review + worksheets + analytics open,
      no daily cap.
- [ ] (Recommended) ICO data-protection registration — the backend already
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
