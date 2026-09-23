import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';

// Executes real SQL and transaction rollbacks, exposing only D1's API shape.
export function makeEnv(overrides = {}) {
  const sqlite = new DatabaseSync(':memory:');
  const directory = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(directory).filter(f => f.endsWith('.sql')).sort())
    sqlite.exec(readFileSync(new URL(file, directory), 'utf8'));
  const DB = {
    prepare(sql) {
      const statement = (params = []) => ({
        sql, params,
        bind(...args) { return statement(args); },
        async first() { return sqlite.prepare(sql).get(...params) || null; },
        async run() {
          const result = sqlite.prepare(sql).run(...params);
          return { success: true, meta: { changes: Number(result.changes) } };
        },
        async all() { return { success: true, results: sqlite.prepare(sql).all(...params) }; },
      });
      return statement();
    },
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const results = statements.map(({sql, params}) => {
          const results = sqlite.prepare(sql).all(...params);
          return { success: true, results, meta: {changes: sqlite.prepare('SELECT changes() AS n').get().n} };
        });
        sqlite.exec('COMMIT');
        return results;
      } catch (e) { sqlite.exec('ROLLBACK'); throw e; }
    },
  };
  const kv = new Map();
  const snapshot = (table, key) => new Map(sqlite.prepare(`SELECT * FROM ${table}`).all().map(r => [r[key], r]));
  return {
    DB, _sqlite: sqlite,
    KV: {
      async get(k) { const v = kv.get(k) || null; await new Promise(r => setTimeout(r, 2)); return v; },
      async put(k,v) { kv.set(k,v); }, async delete(k) { kv.delete(k); },
    },
    _state: {
      get accounts() { return snapshot('accounts','email'); },
      get sessions() { return snapshot('sessions','session_id'); },
      get entitlements() { return snapshot('entitlements','account_id'); },
      get events() { return new Set(snapshot('stripe_events','event_id').keys()); }, kv,
    },
    ENVIRONMENT: 'local',
    ALLOWED_ORIGIN: 'http://localhost:8000',
    MAGIC_LINK_BASE: 'http://localhost:8000/app.html',
    CONSENT_VERSION: '2026-05-22',
    EMAIL_PROVIDER: 'console', EMAIL_FROM: 'Audit <audit@example.invalid>',
    PRICE_ONEOFF: 'price_one', PRICE_FAMILY: 'price_fam', PRICE_ANNUAL: 'price_ann',
    ACCESS_DAYS_ONEOFF: '1095', ACCESS_DAYS_FAMILY: '1095', ACCESS_DAYS_ANNUAL: '365',
    FAMILY_SEATS: '3', PAYMENTS_ENABLED: 'false', STRIPE_LIVE_MODE: 'false',
    AUTH_EMAIL_LIMIT: '5', AUTH_IP_LIMIT: '20', AUTH_DAILY_LIMIT: '1000',
    STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_SECRET: 'sk_test_unused',
    ...overrides,
  };
}

export async function stripeSig(payload, secret) {
  const enc = new TextEncoder();
  const t = Math.floor(Date.now()/1000);
  const key = await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const mac = await crypto.subtle.sign('HMAC',key,enc.encode(`${t}.${payload}`));
  return `t=${t},v1=${Buffer.from(mac).toString('hex')}`;
}
