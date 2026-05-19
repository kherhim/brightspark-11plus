-- Brightspark 11+ monetisation schema (D1 / SQLite).
-- Minimal monetisation backbone only: accounts, sessions, entitlement,
-- Stripe idempotency. Magic-link tokens live in KV (TTL + single-use),
-- not here. No child PII, no progress, no benchmarking (deferred).

CREATE TABLE IF NOT EXISTS accounts (
  account_id      TEXT PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  created_at      INTEGER NOT NULL,
  consent_at      INTEGER,
  consent_version TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  session_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_account ON sessions(account_id);

-- One row per account. status = 'none' | 'active'. plan = oneoff|family|annual.
CREATE TABLE IF NOT EXISTS entitlements (
  account_id      TEXT PRIMARY KEY,
  plan            TEXT,
  status          TEXT NOT NULL DEFAULT 'none',
  seats           INTEGER NOT NULL DEFAULT 1,
  valid_until     INTEGER,
  stripe_customer TEXT,
  updated_at      INTEGER NOT NULL
);

-- Stripe webhook idempotency: an event id is processed at most once.
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id    TEXT PRIMARY KEY,
  type        TEXT,
  received_at INTEGER NOT NULL
);
