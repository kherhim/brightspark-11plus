# Brightspark 11+ — Project Status

_Last updated: 2026-05-19_

Living status doc. The economic rationale lives in the **private** (gitignored)
`ECONOMICS.md`; this file is the operational state.

## What it is

Free-to-start, local-first UK 11+ practice web app (Maths · Verbal Reasoning ·
Non-Verbal Reasoning · English). Monetised via one-off paid access. Free tier
is the acquisition funnel; goal is ~£20k/month profit (see `ECONOMICS.md`).

## Live

- **Site (GitHub Pages):** https://kherhim.github.io/brightspark-11plus/
  (landing `index.html`, app `app.html`, `privacy.html`, `terms.html`)
- **Backend (Cloudflare Worker):**
  https://brightspark-worker-production.brightspark.workers.dev
- **Repo:** public (`kherhim/brightspark-11plus`); Pages serves `main`.

## Architecture

- Zero-build static SPA (HTML/CSS/ES modules), local-first (localStorage,
  schema v4). Free tier makes **zero** backend calls; nothing leaves the device.
- Minimal backend: Cloudflare Worker + D1 (SQLite) + KV — passwordless
  magic-link auth, server-verified entitlement, Stripe Checkout + webhook.
  Single shared D1+KV across envs for now (split before real scale).
- Payments: Stripe (test mode), Stripe Tax to be enabled. We never see card
  data. Secrets live only in the operator's macOS Keychain / `wrangler secret`.

## Stage status

| Stage | State |
|---|---|
| Phases 1–4A (product) | ✅ shipped |
| Stage A — landing + funnel + paywall scaffold | ✅ |
| Stage B — backend (auth + entitlement + Stripe), dormant | ✅ |
| C1 — D1/KV created + schema migrated | ✅ |
| C2 — Worker deployed + smoke (payments off) | ✅ |
| C3 — Stripe products/prices/webhook/secrets (all via API) | ✅ |
| C4 — frontend cutover (API_BASE live, merged to main, deployed) | ✅ |
| C5 — full test-mode E2E purchase | ✅ **passed** |
| C6 — compliance + go live | ⏳ in progress |

C5 proved end-to-end: signup → magic link → verify → session → checkout →
Stripe test card → webhook → entitlement → paid unlock → cross-device →
single-use token (no sharing). Client 428/428, Worker 14/14 green.

## Pricing (final, ladder A — Stripe Price amounts are immutable)

| Plan | Price (one-off, GBP) | Access | Seats |
|---|---|---|---|
| Annual | £29 | 12 months (365 d) | 1 |
| 11+ Access | £34 | ~3 years (1095 d) | 1 |
| Family | £49 | ~3 years (1095 d) | up to 3 |

Free = Maths + daily question cap. Paid = all 4 subjects + mocks + smart
review + readiness analytics + worksheets, no daily cap.

## Current safety state

`PAYMENTS_ENABLED="false"` in `worker/wrangler.toml` (committed) — charging is
impossible until a deliberate launch. **Pending action:** redeploy the Worker
so the live `/config` reflects this (it was left on after the C5 test until
the next `npm run deploy:prod`).

## C6 — remaining before real revenue

- [ ] Fill `[OPERATOR: …]` placeholders in `privacy.html` / `terms.html`
      (legal/trading name, contact email, ICO registration no., refund stance).
- [ ] Real transactional email (e.g. Resend) so magic links actually send —
      currently logged only (visible via `wrangler tail`).
- [ ] ICO data-protection registration (~£40–60/yr) + children's-data
      (Age-Appropriate Design Code) review.
- [ ] Enable Stripe Tax; consider VAT registration (compulsory >£90k turnover).
- [ ] Stripe account activation (business + bank); swap **test → live** keys
      via `wrangler secret put`.
- [ ] Flip `PAYMENTS_ENABLED="true"` with live keys + redeploy = **launch**.
- [ ] Brief legal review of privacy/terms recommended pre-launch.

## Deferred (not in scope now)

Progress cloud-sync, benchmarking/cohorts, AI essay marking, age-range
expansion (KS2 SATs / 7+–8+ / 13+ — the long-term LTV play in `ECONOMICS.md`).

## Operational notes

- Cloudflare API token + Stripe secrets: macOS Keychain only
  (`security find-generic-password -s CLOUDFLARE_API_TOKEN/STRIPE_TEST_KEY/
  STRIPE_WHSEC -w`). Never in repo/chat/`wrangler.toml`.
- Commits: author `kherhim`, never the work email. Push is held manually
  (outward-facing); privacy/terms must have placeholders filled before push.
- Tests: client `node tests/run-node.mjs`; Worker `cd worker && node --test
  test/*.test.mjs`.
