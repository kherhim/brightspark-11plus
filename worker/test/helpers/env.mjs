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
      get events() { return new Set(snapshot('stripe_events','event_id').keys()); },
      get fulfillments() { return sqlite.prepare('SELECT count(*) AS n FROM checkout_fulfillments').get().n; }, kv,
    },
    ENVIRONMENT: 'local',
    ALLOWED_ORIGIN: 'http://localhost:8000',
    MAGIC_LINK_BASE: 'http://localhost:8000/app.html',
    CONSENT_VERSION: '2026-05-22',
    EMAIL_PROVIDER: 'console', EMAIL_FROM: 'Audit <audit@example.invalid>',
    AUTH_EMAIL_LIMIT: '5', AUTH_IP_LIMIT: '20', AUTH_DAILY_LIMIT: '1000',
    ...overrides,
  };
}
