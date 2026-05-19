# Brightspark 11+ — monetisation Worker (runbook)

The minimal backend that turns the free app into a paid one: passwordless
magic-link auth, server-verified entitlement, Stripe Checkout. **Separate
dev-only sub-project** — the static site stays zero-build and does not
depend on this at build time.

**Ships dormant.** The frontend only talks to this when `js/config.js`'s
`API_BASE` is set. Until then the live site is the exact free, no-account
app (proven by `tests/monetisation.test.js`: "no backend → free, no throw").

Architecture note: magic-link tokens live in **KV** (TTL + single-use via
delete); accounts/sessions/entitlements/stripe idempotency live in **D1**.
No child PII, no progress sync, no benchmarking (deferred).

---

## What only YOU can do (external accounts/keys)

These block a real deploy; everything else is built and tested.

### 1. Cloudflare
```bash
cd worker
npm install                       # installs wrangler (dev-only)
npx wrangler login                # opens browser; authorises your account
npx wrangler d1 create brightspark            # → copy database_id
npx wrangler kv namespace create KV           # → copy id
```
Paste the returned ids into `wrangler.toml` (`database_id`, KV `id`). For
staging/prod create separate D1/KV and fill `[env.staging]` / `[env.production]`.

Apply the schema:
```bash
npm run migrate:local      # local dev DB
# later: npm run migrate:staging ; npm run migrate:prod
```

### 2. Stripe (test mode first)
- Create **3 Products/Prices** (one-time): "11+ Access" £34, "Family" £49,
  "Annual" £39. Copy the three `price_…` ids into `wrangler.toml`
  (`PRICE_ONEOFF/FAMILY/ANNUAL`, all envs).
- **Settings → Tax**: enable **Stripe Tax** (handles VAT once you're
  registered; the checkout already sends `automatic_tax[enabled]=true`).
- **Developers → Webhooks**: add endpoint
  `https://<your-worker-domain>/stripe/webhook`, event
  `checkout.session.completed`. Copy the signing secret.
- Set secrets (never commit these):
```bash
npx wrangler secret put STRIPE_SECRET           # sk_test_…
npx wrangler secret put STRIPE_WEBHOOK_SECRET   # whsec_…
# email provider (prod only; dev/staging use the console transport):
npx wrangler secret put EMAIL_API_KEY           # e.g. Resend key
```

### 3. Email
Dev/staging use `EMAIL_PROVIDER=console` — the magic link is printed in
`wrangler dev` / `wrangler tail` logs (no real sends, fully testable
offline). For prod set `EMAIL_PROVIDER=resend`, a verified `EMAIL_FROM`
domain, and `EMAIL_API_KEY`.

---

## Local development

```bash
cd worker
npm run migrate:local
npx wrangler dev                      # Worker at http://localhost:8787
# in another terminal, to exercise the webhook with no real charges:
stripe listen --forward-to localhost:8787/stripe/webhook
```
Point the frontend at it: in `js/config.js` set
`API_BASE = "http://localhost:8787"`, then serve the site
(`python3 -m http.server 8000`) and open `http://localhost:8000/app.html`.

Manual E2E (Stripe **test** mode, card `4242 4242 4242 4242`):
`#/signup` → enter email + consent → grab the magic link from the
`wrangler dev` log → it opens `#/verify/<token>` → lands on `#/account` →
(with `PAYMENTS_ENABLED=true`) pick a plan → Stripe test checkout →
`checkout.session.completed` → `/me` returns `paid:true` → premium unlocks.

---

## Tests

- Worker core logic: `npm test` (plain `node --test`, no miniflare needed)
  — covers token/hash, CORS, Stripe **signature verification**,
  entitlement + `valid_until` mapping, idempotency helpers.
- Client (from repo root): `node tests/run-node.mjs` — includes
  `monetisation.test.js` proving the no-backend free path never throws.

---

## Deploy & cutover

```bash
# staging: CLOUD on, PAYMENTS on, Stripe TEST keys
npm run migrate:staging && npm run deploy:staging
# production: CLOUD on, PAYMENTS OFF until deliberate launch
npm run migrate:prod && npm run deploy:prod
```
Cutover sequence (Stage C):
1. Validate everything in **staging** (incl. cross-device + no-sharing —
   see checklist).
2. Set `js/config.js` `API_BASE` to the prod Worker URL; deploy the site.
   Sign-in works; `/me` says `paid:false`; payments still **off** (so no
   one is charged) — the app is unchanged for everyone, just sign-in-able.
3. When ready to charge: flip `PAYMENTS_ENABLED="true"` in
   `[env.production]`, redeploy the Worker. That is the revenue switch.

`ALLOWED_ORIGIN` / `MAGIC_LINK_BASE` must match the site origin. If/when
the site moves to **Cloudflare Pages** (recommended for private source +
same-origin with this Worker), update both.

---

## Verification checklist (the requirements that drove this design)

- [ ] Magic token is single-use (second `/auth/verify` with same token → 400)
      and expires after 15 min.
- [ ] `/me` with no/expired session → `401 {authenticated:false,paid:false}`.
- [ ] Webhook rejects a bad/absent `Stripe-Signature`; a replayed event id
      is ignored (idempotent).
- [ ] **Cross-device:** pay on device A → sign in on device B → `paid:true`
      (entitlement follows the account, not the device).
- [ ] **No key sharing:** there is no shareable key — access requires the
      emailed magic link → a server session; sharing a URL grants nothing.
- [ ] With `API_BASE=""` the site is byte-for-byte the free app
      (`node tests/run-node.mjs` green; `#/signup` shows "coming soon").
- [ ] `PAYMENTS_ENABLED=false` → `/checkout` returns `403 {disabled:true}`
      and the Account screen shows "payments aren't live yet".
