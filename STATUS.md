# Brightspark Prep — Project Status

_Last updated: 2026-05-20_

Living status doc. The economic rationale lives in the **private** (gitignored)
`ECONOMICS.md`; this file is the operational state.

## What it is

Free-to-start, local-first UK 11+ practice web app (Maths · Verbal Reasoning ·
Non-Verbal Reasoning · English). Monetised via one-off paid access. Free tier
is the acquisition funnel; goal is ~£20k/month profit (see `ECONOMICS.md`).

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
  schema v4). Free tier makes **zero** backend calls; nothing leaves the device.
- Minimal backend: Cloudflare Worker + D1 (SQLite) + KV — passwordless
  magic-link auth, server-verified entitlement, Stripe Checkout + webhook.
  Single shared D1+KV across envs for now (split before real scale).
- Payments: Stripe (test mode), Stripe Tax to be enabled. We never see card
  data. Secrets live only in the operator's macOS Keychain / `wrangler secret`.
- Transactional email: **Resend** (eu-west-1), verified domain
  `brightsparkprep.com` (DKIM/SPF/MX live), sender
  `Brightspark Prep <no-reply@brightsparkprep.com>`.

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
| C6 — compliance + go live | 🔧 in progress (see sub-status below) |

C5 proved end-to-end: signup → magic link → verify → session → checkout →
Stripe test card → webhook → entitlement → paid unlock → cross-device →
single-use token (no sharing). Client 428/428, Worker 14/14 green.

### C6 sub-status

| Task | State |
|---|---|
| Privacy + Terms pages drafted, operator values filled | ✅ |
| Warm-gold palette (anti-Atom visual differentiation) | ✅ |
| Brand renamed: "Brightspark 11+" → **"Brightspark Prep"** | ✅ |
| Custom domain `brightsparkprep.com` live over HTTPS | ✅ |
| Resend live — real magic-link emails sending (DKIM/SPF verified) | ✅ |
| Worker CORS + `EMAIL_FROM` updated for custom domain | ✅ |
| **Live signup E2E confirmed on production domain (2026-05-20)** | ✅ |
| ICO data-protection registration (~£35–40/yr) | ⏳ |
| Stripe account activation (business + bank) | ⏳ |
| Enable Stripe Tax | ⏳ |
| Test → live Stripe key swap (`sk_live_…`, `whsec_…`) | ⏳ |
| Brief legal sense-check of privacy/terms (optional, recommended) | ⏳ |
| Flip `PAYMENTS_ENABLED="true"` + redeploy = **launch** | ⏳ |

## Pricing (final, ladder A — Stripe Price amounts are immutable)

| Plan | Price (one-off, GBP) | Access | Seats |
|---|---|---|---|
| Annual | £29 | 12 months (365 d) | 1 |
| 11+ Access | £34 | ~3 years (1095 d) | 1 |
| Family | £49 | ~3 years (1095 d) | up to 3 |

Free = Maths + daily question cap. Paid = all 4 subjects + mocks + smart
review + readiness analytics + worksheets, no daily cap.

## Current safety state

`PAYMENTS_ENABLED="false"` in `worker/wrangler.toml` and **live on the
deployed Worker** (`/config` confirms). `/checkout` returns 403. Charging is
impossible until the deliberate launch flip.

## C6 — remaining before real revenue

All paperwork + external setup; no code blockers. In any order:

- [ ] **ICO data-protection registration** (~15 min, £35–40) at
      ico.org.uk/registration. Paste the reference number → 1-line update
      to `privacy.html` ("registration in progress" → real number).
- [ ] **Stripe account activation** (business + bank verification).
- [ ] **Enable Stripe Tax** so UK VAT is added automatically at checkout.
      Consider voluntary VAT registration; compulsory only > £90k turnover.
- [ ] **Test → live Stripe key swap:** `wrangler secret put STRIPE_SECRET
      --env production` with `sk_live_…`; create live webhook endpoint →
      `wrangler secret put STRIPE_WEBHOOK_SECRET --env production`.
- [ ] **Brief legal sense-check** of `privacy.html`/`terms.html` (optional
      but recommended; ~1-hour UK consumer lawyer consult).
- [ ] **Flip `PAYMENTS_ENABLED="true"`** + `npm run deploy:prod` = **launch**.

## Deferred (not in scope now)

Progress cloud-sync, benchmarking/cohorts, AI essay marking, age-range
expansion (KS2 SATs / 7+–8+ / 13+ — the long-term LTV play in `ECONOMICS.md`).

## Operational notes

- Secrets in macOS Keychain (`security find-generic-password -s <NAME> -w`):
  `CLOUDFLARE_API_TOKEN`, `STRIPE_TEST_KEY`, `STRIPE_WHSEC`. Never in
  repo/chat/`wrangler.toml`. Resend API key is in `wrangler secret` only
  (`EMAIL_API_KEY` on env.production).
- Commits: author `kherhim` (NOT the work email). Outward-facing actions
  (push, prod deploy) are confirmed before execution.
- Tests: client `node tests/run-node.mjs`; Worker `cd worker && node --test
  test/*.test.mjs`.
- Domain DNS: Cloudflare (Registrar + DNS). GitHub Pages records (4 apex
  A + www CNAME) are **DNS only** (grey cloud), so GitHub provisions its
  own Let's Encrypt cert. Resend records (DKIM TXT at `resend._domainkey`,
  SPF TXT + MX at `send`) are TXT/MX (no proxy concept).
