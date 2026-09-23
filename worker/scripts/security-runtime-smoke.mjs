// Local workerd/D1 verification. Build with Wrangler --dry-run first.
// No real emails, cloud bindings, accounts, or payments are used.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { stripeSig } from '../test/helpers/env.mjs';
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
    STRIPE_WEBHOOK_SECRET: 'whsec_test', STRIPE_LIVE_MODE: 'false',
    AUTH_EMAIL_LIMIT: '5', AUTH_IP_LIMIT: '20', AUTH_DAILY_LIMIT: '100',
    PAYMENTS_ENABLED: 'false', FREE_ERA: 'true',
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
  const event={id:'evt_runtime',type:'checkout.session.completed',livemode:false,data:{object:{
    id:'cs_runtime',mode:'payment',payment_status:'paid',livemode:false,
    metadata:{account_id:row.account_id,plan:'oneoff'},customer:'cus_test',
  }}};
  async function sendEvent(e=event) {
    const body=JSON.stringify(e);
    return mf.dispatchFetch('https://audit.example/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':await stripeSig(body,'whsec_test')},body});
  }
  const unpaid=structuredClone(event);unpaid.data.object.payment_status='unpaid';
  assert.equal((await sendEvent(unpaid)).status,200);
  assert.equal((await db.prepare('SELECT status FROM entitlements').first()).status,'none');
  await db.prepare("CREATE TRIGGER fail_grant BEFORE UPDATE ON entitlements BEGIN SELECT RAISE(ABORT,'audit failure'); END").run();
  assert.equal((await sendEvent()).status,500);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM stripe_events').first()).n,0);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM checkout_fulfillments').first()).n,0);
  await db.prepare('DROP TRIGGER fail_grant').run();
  assert.equal((await sendEvent()).status,200);
  const ent=await db.prepare('SELECT * FROM entitlements').first();assert.equal(ent.status,'active');
  const replays=await Promise.all([1,2,3].map(()=>sendEvent()));
  assert.deepEqual(replays.map(r=>r.status),[200,200,200]);
  assert.equal((await db.prepare('SELECT valid_until FROM entitlements').first()).valid_until,ent.valid_until);
  await Promise.all(Array.from({length:10},()=>post('/auth/request',{email:'audit@example.invalid'})));
  assert.equal(mail.length,5);
  console.log('Local workerd/D1 security smoke passed: migrations, single-use tokens, email cap, unpaid checkout, rollback/retry, deduplication.');
} finally { await mf.dispose(); }
