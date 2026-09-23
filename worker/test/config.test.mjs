import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { validateRemoteConfig } from '../scripts/check-config.mjs';

function config() {
  const environment = (name, id, host) => ({
    vars: {
      ENVIRONMENT: name, EMAIL_PROVIDER: 'resend',
      ALLOWED_ORIGIN: `https://${host}`, MAGIC_LINK_BASE: `https://${host}/app.html`,
      STRIPE_LIVE_MODE: name === 'production' ? 'true' : 'false',
      PAYMENTS_ENABLED: 'false', AUTH_EMAIL_LIMIT: '5', AUTH_IP_LIMIT: '20', AUTH_DAILY_LIMIT: '100',
    },
    d1_databases: [{ binding: 'DB', database_name: `brightspark-${name}`, database_id: id }],
  });
  return {
    d1_databases: [{ binding: 'DB', database_name: 'brightspark-local', database_id: '00000000-0000-0000-0000-000000000000' }],
    env: {
      staging: environment('staging', '11111111-1111-4111-8111-111111111111', 'staging.example.org'),
      production: environment('production', '22222222-2222-4222-8222-222222222222', 'brightsparkprep.com'),
    },
  };
}

test('dedicated remote environments pass validation', () => {
  for (const environment of ['staging', 'production']) {
    assert.doesNotThrow(() => validateRemoteConfig(config(), environment));
  }
});

const unsafe = [
  ['missing database', c => { delete c.env.staging.d1_databases; }],
  ['zero database', c => { c.env.staging.d1_databases[0].database_id = '00000000-0000-0000-0000-000000000000'; }],
  ['malformed database', c => { c.env.staging.d1_databases[0].database_id = 'placeholder'; }],
  ['shared production database', c => { c.env.staging.d1_databases[0].database_id = c.env.production.d1_databases[0].database_id; }],
  ['shared local database', c => { c.d1_databases[0].database_id = c.env.staging.d1_databases[0].database_id; }],
  ['shared database name', c => { c.env.staging.d1_databases[0].database_name = c.env.production.d1_databases[0].database_name; }],
  ['duplicate DB bindings', c => { c.env.staging.d1_databases.push(c.env.staging.d1_databases[0]); }],
  ['missing environment', c => { delete c.env.staging.vars.ENVIRONMENT; }],
  ['wrong environment', c => { c.env.staging.vars.ENVIRONMENT = 'production'; }],
  ['console email', c => { c.env.staging.vars.EMAIL_PROVIDER = 'console'; }],
  ['live staging Stripe', c => { c.env.staging.vars.STRIPE_LIVE_MODE = 'true'; }],
  ['invalid payment flag', c => { c.env.staging.vars.PAYMENTS_ENABLED = 'yes'; }],
  ['missing auth limit', c => { delete c.env.staging.vars.AUTH_EMAIL_LIMIT; }],
  ['unbounded auth limit', c => { c.env.staging.vars.AUTH_DAILY_LIMIT = '0'; }],
  ['staging production origin', c => { c.env.staging.vars.ALLOWED_ORIGIN = 'https://brightsparkprep.com'; }],
  ['staging production link', c => { c.env.staging.vars.MAGIC_LINK_BASE = 'https://brightsparkprep.com/app.html'; }],
  ['matching staging URLs on production host', c => {
    c.env.staging.vars.ALLOWED_ORIGIN = 'https://brightsparkprep.com';
    c.env.staging.vars.MAGIC_LINK_BASE = 'https://brightsparkprep.com/app.html';
  }],
  ['placeholder origin', c => { c.env.staging.vars.ALLOWED_ORIGIN = 'https://staging.invalid'; }],
  ['placeholder link', c => { c.env.staging.vars.MAGIC_LINK_BASE = 'https://staging.invalid/app.html'; }],
  ['insecure origin', c => { c.env.staging.vars.ALLOWED_ORIGIN = 'http://staging.example.org'; }],
  ['localhost origin', c => { c.env.staging.vars.ALLOWED_ORIGIN = 'https://localhost'; }],
  ['unapproved link origin', c => { c.env.staging.vars.MAGIC_LINK_BASE = 'https://other.example.org/app.html'; }],
  ['retained KV binding', c => { c.env.staging.kv_namespaces = [{ binding: 'KV', id: 'old' }]; }],
];
for (const [name, mutate] of unsafe) {
  test(`remote guard rejects ${name}`, () => {
    const candidate = config();
    mutate(candidate);
    assert.throws(() => validateRemoteConfig(candidate, 'staging'));
  });
}

test('production rejects test Stripe and console email', () => {
  for (const [key, value] of [['STRIPE_LIVE_MODE', 'false'], ['EMAIL_PROVIDER', 'console']]) {
    const candidate = config();
    candidate.env.production.vars[key] = value;
    assert.throws(() => validateRemoteConfig(candidate, 'production'));
  }
});

test('remote guard rejects unspecified or local environment', () => {
  for (const environment of [undefined, '', 'local', 'prod']) {
    assert.throws(() => validateRemoteConfig(config(), environment));
  }
});

test('checked-in configuration blocks unprovisioned staging and permits production preflight only', () => {
  const script = new URL('../scripts/check-config.mjs', import.meta.url);
  const production = spawnSync(process.execPath, [script.pathname, 'production'], { encoding: 'utf8' });
  assert.equal(production.status, 0, production.stderr);
  const staging = spawnSync(process.execPath, [script.pathname, 'staging'], { encoding: 'utf8' });
  assert.equal(staging.status, 1);
  assert.match(staging.stderr, /Provision a dedicated staging D1 database/);
});
