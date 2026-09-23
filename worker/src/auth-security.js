import { sha256hex } from './lib.js';

export function environment(env) {
  if (!['local', 'staging', 'production'].includes(env.ENVIRONMENT))
    throw new Error('Environment must be explicit');
  return env.ENVIRONMENT;
}

export function emailTransportReady(request, env) {
  if (env.EMAIL_PROVIDER === 'resend') return !!env.EMAIL_API_KEY;
  return env.EMAIL_PROVIDER === 'console' && env.ENVIRONMENT === 'local' &&
    ['localhost', '127.0.0.1', '[::1]'].includes(new URL(request.url).hostname);
}

function limit(value, fallback) {
  const n = Number(value ?? fallback);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('Invalid auth limit');
  return n;
}

async function reserve(env, scope, subject, seconds, max, now) {
  const window = Math.floor(now / (seconds * 1000)) * seconds * 1000;
  // The capped increment and decision are one database write, never KV read/modify/write.
  const row = await env.DB.prepare(`
    INSERT INTO auth_limits (environment,scope,subject,window_start,count,expires_at)
    VALUES (?,?,?,?,1,?)
    ON CONFLICT(environment,scope,subject,window_start) DO UPDATE SET count=count+1
    WHERE count < ? RETURNING count
  `).bind(environment(env), scope, subject, window, window + seconds * 1000, max).first();
  return !!row;
}

export async function reserveEmail(request, env, email, now = Date.now()) {
  // Expired records are indexed and pruned on authentication requests.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_limits WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM magic_tokens WHERE expires_at <= ?').bind(now),
  ]);
  const dailyMax = limit(env.AUTH_DAILY_LIMIT, 1000);
  // A cheap early check avoids creating new buckets once the daily budget is
  // exhausted. The final atomic reservation below is the authoritative check.
  const daily = await env.DB.prepare(
    "SELECT count FROM auth_limits WHERE environment=? AND scope='daily' AND subject='all' AND window_start=?"
  ).bind(environment(env), Math.floor(now / 86400000) * 86400000).first();
  if (daily && daily.count >= dailyMax) return false;
  // Cloudflare supplies this header. Do not trust user-controlled X-Forwarded-For.
  // Missing source addresses share a bucket, never bypass the limit.
  const source = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!await reserve(env, 'source', await sha256hex(source), 900, limit(env.AUTH_IP_LIMIT, 20), now)) return false;
  if (!await reserve(env, 'email', await sha256hex(email), 900, limit(env.AUTH_EMAIL_LIMIT, 5), now)) return false;
  // Blocked sources/addresses do not drain the global allowance. Delivery
  // attempts (including provider failures) reserve budget without refunds.
  return reserve(env, 'daily', 'all', 86400, dailyMax, now);
}
