-- Deliberately invalidate sessions minted before environment isolation.
-- Accounts, entitlements, and device-local learner progress are preserved.
ALTER TABLE sessions ADD COLUMN environment TEXT NOT NULL DEFAULT 'legacy';
CREATE TABLE magic_tokens (
  environment TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (environment, token_hash)
);
CREATE INDEX idx_magic_tokens_expiry ON magic_tokens(expires_at);
CREATE TABLE auth_limits (
  environment TEXT NOT NULL,
  scope TEXT NOT NULL,
  subject TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  PRIMARY KEY (environment, scope, subject, window_start)
);
CREATE INDEX idx_auth_limits_expiry ON auth_limits(expires_at);
CREATE TABLE checkout_fulfillments (
  environment TEXT NOT NULL,
  checkout_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts(account_id),
  event_id TEXT NOT NULL,
  fulfilled_at INTEGER NOT NULL,
  PRIMARY KEY (environment, checkout_id)
);
