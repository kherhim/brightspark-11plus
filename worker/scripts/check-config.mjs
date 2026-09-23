import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parse } from 'smol-toml';

const ZERO_ID = '00000000-0000-0000-0000-000000000000';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requireSafe(condition, message) {
  if (!condition) throw new Error(message);
}

function remoteUrl(value) {
  const url = new URL(value);
  requireSafe(url.protocol === 'https:' && !url.username && !url.password,
    'Remote frontend URLs must use HTTPS without credentials.');
  requireSafe(!/(^|\.)(invalid|localhost|test)$/.test(url.hostname)
    && !['127.0.0.1', '[::1]'].includes(url.hostname),
  'Replace the staging frontend placeholder with a provisioned remote frontend.');
  return url;
}

export function validateRemoteConfig(config, environment) {
  requireSafe(['staging', 'production'].includes(environment),
    'Specify staging or production explicitly for a remote operation.');
  const selected = config.env?.[environment];
  requireSafe(selected, `Missing ${environment} configuration.`);
  const databases = selected.d1_databases?.filter(db => db.binding === 'DB') ?? [];
  requireSafe(databases.length === 1, 'Configure exactly one explicit DB binding.');
  const database = databases[0];
  requireSafe(UUID.test(database.database_id) && database.database_id !== ZERO_ID,
    `Provision a dedicated ${environment} D1 database and replace its placeholder ID.`);
  requireSafe(typeof database.database_name === 'string' && database.database_name.trim(),
    'Set an explicit database name.');
  const others = [config, ...Object.entries(config.env ?? {})
    .filter(([name]) => name !== environment).map(([, value]) => value)];
  for (const other of others) {
    for (const db of other.d1_databases ?? []) {
      requireSafe(db.database_id?.toLowerCase() !== database.database_id.toLowerCase()
        && db.database_name !== database.database_name,
      'Remote environments must not share D1 IDs or names with another environment or local defaults.');
    }
  }
  requireSafe(!selected.kv_namespaces?.length, 'Remove legacy KV bindings before deploying the D1 token store.');
  const vars = selected.vars ?? {};
  requireSafe(vars.ENVIRONMENT === environment, 'ENVIRONMENT must match the selected environment.');
  requireSafe(vars.EMAIL_PROVIDER === 'resend', 'Remote environments must send email through Resend, never console logs.');
  requireSafe(vars.STRIPE_LIVE_MODE === (environment === 'production' ? 'true' : 'false'),
    'STRIPE_LIVE_MODE must be true only in production.');
  requireSafe(['true', 'false'].includes(vars.PAYMENTS_ENABLED), 'Set PAYMENTS_ENABLED explicitly.');
  for (const key of ['AUTH_EMAIL_LIMIT', 'AUTH_IP_LIMIT', 'AUTH_DAILY_LIMIT']) {
    requireSafe(/^[1-9]\d*$/.test(vars[key]) && Number.isSafeInteger(Number(vars[key])),
      `${key} must be an explicit positive integer.`);
  }
  const origins = String(vars.ALLOWED_ORIGIN ?? '').split(',').map(value => remoteUrl(value.trim()));
  requireSafe(origins.every(url => url.pathname === '/' && !url.search && !url.hash),
    'ALLOWED_ORIGIN must contain origins, without paths, queries or fragments.');
  const link = remoteUrl(vars.MAGIC_LINK_BASE);
  requireSafe(origins.some(url => url.origin === link.origin), 'MAGIC_LINK_BASE must use an allowed frontend origin.');
  if (environment === 'staging') {
    const production = config.env?.production?.vars ?? {};
    const productionHosts = new Set([
      ...String(production.ALLOWED_ORIGIN ?? '').split(','), production.MAGIC_LINK_BASE,
      'https://brightsparkprep.com', 'https://www.brightsparkprep.com', 'https://kherhim.github.io',
    ].filter(Boolean).map(value => new URL(value.trim()).hostname));
    requireSafe([...origins, link].every(url => !productionHosts.has(url.hostname)),
      'Staging must not use production frontend origins or magic-link destinations.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const environment = process.argv[2];
    const config = parse(readFileSync(new URL('../wrangler.toml', import.meta.url), 'utf8'));
    validateRemoteConfig(config, environment);
    console.log(`${environment} remote configuration checks passed.`);
  } catch (error) {
    console.error(`Remote operation blocked: ${error.message}`);
    process.exitCode = 1;
  }
}
