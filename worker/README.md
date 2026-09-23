# Brightspark Prep Worker runbook

This separate backend provides parent magic-link authentication, sessions,
entitlements and Stripe Checkout. The static learner app remains zero-build.
Learner progress stays in the browser; these changes do not clear or move it.

Tokens, authentication rate limits, accounts, sessions, entitlements and Stripe
idempotency records live in D1. KV is no longer bound or used. A magic link is
claimed atomically once, and expires after 15 minutes. Remote environments send
links through Resend; only local development can use console email.

## Local development and verification

Use Node **22.13 or later**: the integration tests use built-in `node:sqlite`.
Wrangler and the configuration TOML parser are development dependencies only.

```bash
cd worker
npm ci
npm run migrate:local
npm run dev
# Separate terminal:
npm test
npm audit
# From repository root:
node tests/run-node.mjs
```

Default configuration targets `brightspark-local`, with a zero UUID sentinel,
and uses `ENVIRONMENT=local`. Local migrations explicitly use `--local`.
Point the frontend `API_BASE` in `js/config.js` at `http://localhost:8787`,
serve the site on port 8000, and use console links from local development.
Use Stripe test credentials locally; a local Stripe CLI listener can forward
signed events to `http://localhost:8787/stripe/webhook`.

## Environment boundaries

| Setting | Local | Staging | Production |
| --- | --- | --- | --- |
| D1 | brightspark-local | brightspark-staging, dedicated | existing brightspark |
| ENVIRONMENT | local | staging | production |
| Email | console | resend | resend |
| STRIPE_LIVE_MODE | false | false | true |
| Payments | off | test mode on | off |
| Auth email / IP / daily limits | 5 / 20 / 1000 | 5 / 20 / 100 | 5 / 20 / 1000 |

Staging uses its own provisioned D1 database and frontend at
`https://brightspark-staging-site.brightspark.workers.dev`. The production
database ID is retained; neither local configuration nor staging points to it.
Each environment declares its variables explicitly because Wrangler does not
inherit environment variables and resource bindings in the same way as other
configuration settings.

The `deploy:*` and remote `migrate:*` npm commands run `scripts/check-config.mjs`
first. The guard parses TOML and rejects missing, zero or shared D1 IDs/names,
staging production URLs, placeholder frontend URLs, remote console email,
incorrect environment/Stripe modes and invalid authentication budgets. It also
requires the magic-link destination to match an allowed HTTPS frontend origin.
Use `npm run check:staging` or `npm run check:prod` to inspect configuration
without making remote changes. Call the guarded npm commands for releases;
direct Wrangler invocations bypass this repository-level guard.

## Security rollout procedure

The staging database and frontend have been provisioned for the September 2026
rollout. Follow the procedure below for production; provisioning steps apply
when creating or replacing an environment. See the deployment record below
for the current verified state:

1. **Disable the old staging Worker before production rollout.** Its currently
   deployed version may still write to the shared production D1/KV resources.
   Remove its routes and disable its workers.dev endpoint, or delete the old
   deployment after preserving any required operational evidence. A local TOML
   edit does not disable an existing deployment. Verify it no longer accepts
   requests or Stripe events.
2. Back up production D1 and review accounts, entitlement records and Stripe
   event provenance. Old staging/test data may already be mixed with production
   records. Reconcile suspicious entitlements against actual Stripe live
   transactions manually. Do not bulk-delete or revoke records based solely on
   guessed timestamps, email addresses, or IDs: paid production records cannot
   safely be inferred from this repository.
3. Provision a dedicated staging D1 database (`wrangler d1 create
   brightspark-staging`) and a staging frontend on a separate origin. Set its
   returned UUID in `[env.staging.d1_databases]`; replace both staging `.invalid`
   URLs. Keep the production D1 ID unchanged and staging Stripe mode false.
4. Configure Resend with a verified sender. Set `EMAIL_API_KEY` separately for
   staging and production. Set environment-specific `STRIPE_SECRET` and
   `STRIPE_WEBHOOK_SECRET`: staging uses test keys/webhook endpoints; production
   uses live keys/webhook endpoints. Keep secrets out of files and logs. Example:

   ```bash
   npx wrangler secret put EMAIL_API_KEY --env staging
   npx wrangler secret put STRIPE_SECRET --env staging
   npx wrangler secret put STRIPE_WEBHOOK_SECRET --env staging
   # Repeat explicitly with --env production and production values.
   ```

5. Review and apply migrations including **`0002_security.sql`**, then deploy
   the matching Worker to isolated staging:

   ```bash
   npm run check:staging
   npm run migrate:staging
   npm run deploy:staging
   ```

6. Verify single-use/expired links, concurrent redemption, email/IP/daily
   limits, expired sessions, test-mode Stripe Checkout and webhook replay
   rejection in staging. Ensure staging cannot read or modify production data
   and that authentication tokens never appear in remote logs.
7. Schedule the production migration and deploy together, after the old staging
   deployment has been disabled and the production data audit is complete:

   ```bash
   npm run check:prod
   npm run migrate:prod
   npm run deploy:prod
   ```

   Production `PAYMENTS_ENABLED` remains **false** and `FREE_ERA` remains true.
   Enabling real charges is a separate, deliberate launch change, including
   review of live Stripe prices, tax settings, privacy/terms and Resend delivery.

## Session and link transition

The security migration marks pre-existing sessions with environment
`legacy`. New sessions are scoped to the active environment, so **all parents
must sign in again** after rollout. Existing emailed KV magic links are also
invalidated: request a new link from the deployed version. This transition
changes authentication only; it does not erase browser learner progress.

Do not roll back to the old shared staging configuration or a Worker that
accepts legacy sessions. Keep the production backup for deliberate recovery,
and investigate rollout errors before restoring any previous code or data.

## Security regression checks

From the repository root, `npm ci && npm test` runs the existing 430 client
checks plus DOM/import security regressions. In `worker/`, `npm ci && npm test`
runs real SQLite-backed endpoint/transaction tests and deployment-guard checks.
Run `npm audit` in both directories after dependency updates.

For an additional local workerd/D1 check (needs permission to bind a loopback
port), build without deploying and run the simulator against that bundle:

```bash
cd worker
npx wrangler deploy --env production --dry-run --outdir /tmp/brightspark-security-worker
node scripts/security-runtime-smoke.mjs /tmp/brightspark-security-worker/index.js
```

The simulator has ephemeral local D1 storage and intercepts all outgoing email
calls. It verifies migration application, concurrent token redemption, email
limits, unpaid checkout rejection, failed-grant rollback, successful retry and
idempotent replay. It does not use remote bindings or send real emails/payments.
It loads bundle text directly because the bundled Miniflare 5 compatibility
adapter's `scriptPath` handling failed at startup in this environment.

Email limits use fixed 15-minute address/source windows and a UTC-day global
budget. The source is Cloudflare's `CF-Connecting-IP`, with a shared restrictive
fallback bucket if absent. Requests blocked by source/address limits do not
consume the global budget. Attempted provider deliveries do, even if delivery
fails. Default production caps are 5/address, 20/source and 1000/day; tune only
with measured demand and mail budget. Console transport is restricted to
explicit local mode on a loopback request hostname.

Configure Stripe webhook subscriptions for both `checkout.session.completed`
and `checkout.session.async_payment_succeeded`. Entitlements require a signed,
mode-matching `payment` Checkout Session with `payment_status=paid`. The
checkout ID prevents two different events granting the same purchase twice;
the grant and deduplication records commit or roll back together.

## September 2026 deployment record

- PR: https://github.com/kherhim/brightspark-11plus/pull/2
- No old staging Worker existed in the Cloudflare inventory at rollout start.
- Production D1 exported before changes; a restricted local backup and a
  separate entitlement-provenance audit are excluded from Git.
- The historical active entitlement matched a paid Stripe test-mode Checkout
  Session. Its record was preserved; review it before enabling monetisation.
- Dedicated staging D1 provisioned and migrations 0001/0002 applied.
- Staging frontend: https://brightspark-staging-site.brightspark.workers.dev
- Staging API: https://brightspark-worker-staging.brightspark.workers.dev
- Staging concurrent redemption returned one success and three rejected
  replays. A real Stripe sandbox Checkout completed and its webhook granted
  the staging-only entitlement.
- Production migration, Worker rollout and frontend publication are pending
  the remaining staging email check. Production payments stay off.

To prepare/redeploy the isolated staging frontend:

```bash
cd worker
node scripts/prepare-staging-site.mjs
npx wrangler deploy --config staging-site.toml
```

Only public assets are copied into the ignored `.staging-site/` directory; its
API base is changed in that generated copy. Production source configuration is
untouched. Staging responses request no indexing and no caching.
