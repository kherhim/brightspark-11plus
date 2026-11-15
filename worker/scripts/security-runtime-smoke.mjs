// Local workerd/D1 verification. Build with Wrangler --dry-run first.
// No real emails, cloud bindings or accounts are used. The service takes
// no payments; this also checks the removed payment routes stay 404.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
const bundle = process.argv[2];
if (!bundle) throw new Error('Usage: node scripts/security-runtime-smoke.mjs /path/to/dry-run/index.js');
const mail = [];
const mf = new Miniflare(convertV4MiniflareOptions({
  modules: true, script: readFileSync(bundle, 'utf8'), compatibilityDate: '2025-01-01',
  d1Databases: ['DB'], cf: false,
  bindings: {
    ENVIRONMENT: 'staging', ALLOWED_ORIGIN: 'https://audit.example',
    MAGIC_LINK_BASE: 'https://audit.example/app.html',
    EMAIL_PROVIDER: 'resend', EMAIL_API_KEY: 'test-only', EMAIL_FROM: 'audit@example.invalid',
    AUTH_EMAIL_LIMIT: '5', AUTH_IP_LIMIT: '20', AUTH_DAILY_LIMIT: '100',
  },
  outboundService: async request => {
    assert.equal(request.url, 'https://api.resend.com/emails');
    mail.push(await request.json());
    return new Response('{}');
  },
}));
try {
  const db = await mf.getD1Database('DB');
  const directory = new URL('../migrations/', import.meta.url);
  for (const file of readdirSync(directory).filter(f=>f.endsWith('.sql')).sort()) {
    const sql = readFileSync(new URL(file,directory),'utf8').replace(/--[^\n]*/g,'');
    await db.batch(sql.split(';').map(s=>s.trim()).filter(Boolean).map(s=>db.prepare(s)));
  }
  const post = (path, body) => mf.dispatchFetch('https://audit.example'+path, {
    method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body),
  });
  assert.equal((await post('/auth/request',{email:'audit@example.invalid'})).status,200);
  const token=mail[0].text.split('#/verify/')[1].split('\n')[0];
  const replies=await Promise.all([1,2,3].map(()=>post('/auth/verify',{token})));
  assert.deepEqual(replies.map(r=>r.status).sort(),[200,400,400]);
  const row=await db.prepare('SELECT account_id FROM accounts').first();assert.ok(row);
  for (const path of ['/checkout','/stripe/webhook'])
    assert.equal((await post(path,{plan:'oneoff',id:'evt_runtime',type:'checkout.session.completed'})).status,404,path);
  assert.equal((await db.prepare('SELECT status FROM entitlements').first()).status,'none');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM stripe_events').first()).n,0);
  await Promise.all(Array.from({length:10},()=>post('/auth/request',{email:'audit@example.invalid'})));
  assert.equal(mail.length,5);
  console.log('Local workerd/D1 security smoke passed: migrations, single-use tokens, email cap, payment routes removed.');
} finally { await mf.dispose(); }
