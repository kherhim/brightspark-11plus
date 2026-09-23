import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';
import { makeEnv, stripeSig } from './helpers/env.mjs';

function request(path, body, ip = '192.0.2.1') {
  return new Request('https://api.test'+path, {method:'POST',headers:{'content-type':'application/json','CF-Connecting-IP':ip},body:JSON.stringify(body)});
}
function setup(t, vars = {}) {
  const env = makeEnv({ENVIRONMENT:'production',EMAIL_PROVIDER:'resend',EMAIL_API_KEY:'test-only',...vars});
  t.after(() => env._sqlite.close());
  const mail = [];
  t.mock.method(globalThis,'fetch',async (url,init) => {
    assert.equal(url,'https://api.resend.com/emails');
    mail.push(JSON.parse(init.body));
    return new Response('{}',{status:200});
  });
  return {env,mail};
}
async function link(env,mail,email='audit@example.invalid') {
  assert.equal((await worker.fetch(request('/auth/request',{email}),env)).status,200);
  return mail.at(-1).text.split('#/verify/')[1].split('\n')[0];
}
async function webhook(env, overrides={}) {
  const event={id:'evt_security',type:'checkout.session.completed',livemode:false,
    data:{object:{id:'cs_security',mode:'payment',payment_status:'paid',livemode:false,
      client_reference_id:'acc_security',customer:'cus_test',metadata:{account_id:'acc_security',plan:'oneoff'}}},...overrides};
  const body=JSON.stringify(event);
  return worker.fetch(new Request('https://api.test/stripe/webhook',{method:'POST',headers:{'Stripe-Signature':await stripeSig(body,env.STRIPE_WEBHOOK_SECRET)},body}),env);
}
function seedAccount(env) {
  env._sqlite.exec("INSERT INTO accounts(account_id,email,created_at) VALUES ('acc_security','parent@example.invalid',1); INSERT INTO entitlements(account_id,status,updated_at) VALUES ('acc_security','none',1)");
}

test('concurrent redemption of one magic token issues exactly one session',async t=>{
  const {env,mail}=setup(t); const token=await link(env,mail);
  // First establish the account so this exercises token consumption, not email uniqueness.
  seedAccount(env);
  const result=await Promise.all([1,2,3,4].map(()=>worker.fetch(request('/auth/verify',{token}),env)));
  assert.deepEqual(result.map(r=>r.status).sort(),[200,400,400,400]);
  assert.equal(env._state.sessions.size,1);
});
test('expired token is rejected even if storage still contains it',async t=>{
  const {env,mail}=setup(t); const token=await link(env,mail);
  const realNow=Date.now; t.mock.method(Date,'now',()=>realNow()+901000);
  assert.equal((await worker.fetch(request('/auth/verify',{token}),env)).status,400);
  assert.equal(env._state.sessions.size,0);
});
test('tokens and sessions cannot cross environment boundaries even with shared bindings',async t=>{
  const {env,mail}=setup(t); const token=await link(env,mail);
  const staging={...env,ENVIRONMENT:'staging'};
  assert.equal((await worker.fetch(request('/auth/verify',{token}),staging)).status,400);
  const verified=await worker.fetch(request('/auth/verify',{token}),env);
  const {session}=await verified.json(); assert.ok(session);
  const req=new Request('https://api.test/me',{headers:{Authorization:'Bearer '+session}});
  assert.equal((await worker.fetch(req,staging)).status,401);
});
test('per-address email limit holds during overlapping requests',async t=>{
  const {env,mail}=setup(t);
  await Promise.all(Array.from({length:12},(_,i)=>worker.fetch(request('/auth/request',{email:'audit@example.invalid'},'192.0.2.'+(i+1)),env)));
  assert.equal(mail.length,5);
});
test('one source cannot evade email limit by rotating addresses',async t=>{
  const {env,mail}=setup(t,{AUTH_IP_LIMIT:'3'});
  await Promise.all(Array.from({length:10},(_,i)=>worker.fetch(request('/auth/request',{email:`audit${i}@example.invalid`}),env)));
  assert.equal(mail.length,3);
});
test('global daily cap holds across addresses and sources',async t=>{
  const {env,mail}=setup(t,{AUTH_DAILY_LIMIT:'4'});
  await Promise.all(Array.from({length:10},(_,i)=>worker.fetch(request('/auth/request',{email:`audit${i}@example.invalid`},'192.0.2.'+(i+1)),env)));
  assert.equal(mail.length,4);
});
test('remote console transport fails closed without logging a magic link',async t=>{
  const {env}=setup(t,{ENVIRONMENT:'staging',EMAIL_PROVIDER:'console'});const logs=[];
  t.mock.method(console,'log',(...args)=>logs.push(args));
  assert.equal((await worker.fetch(request('/auth/request',{email:'audit@example.invalid'}),env)).status,503);
  assert.equal(logs.length,0);
});
test('missing email credentials never fall back to logging tokens',async t=>{
  const {env}=setup(t,{EMAIL_API_KEY:undefined});const logs=[];
  t.mock.method(console,'log',(...args)=>logs.push(args));
  assert.equal((await worker.fetch(request('/auth/request',{email:'audit@example.invalid'}),env)).status,503);
  assert.equal(logs.length,0);
});
test('unpaid checkout does not activate an entitlement',async t=>{
  const {env}=setup(t);seedAccount(env);
  const r=await webhook(env,{data:{object:{id:'cs_unpaid',mode:'payment',payment_status:'unpaid',livemode:false,metadata:{account_id:'acc_security',plan:'oneoff'}}}});
  assert.equal(r.status,200);assert.equal(env._state.entitlements.get('acc_security').status,'none');
});
test('delayed payment success activates entitlement',async t=>{
  const {env}=setup(t);seedAccount(env);
  assert.equal((await webhook(env,{type:'checkout.session.async_payment_succeeded'})).status,200);
  assert.equal(env._state.entitlements.get('acc_security').status,'active');
});
test('test-mode event cannot grant access in live payment environment',async t=>{
  const {env}=setup(t,{STRIPE_LIVE_MODE:'true'});seedAccount(env);
  assert.equal((await webhook(env)).status,400);
  assert.equal(env._state.entitlements.get('acc_security').status,'none');
});
test('webhook update failure rolls back event marker and permits retry',async t=>{
  const {env}=setup(t);seedAccount(env);
  env._sqlite.exec("CREATE TRIGGER fail_grant BEFORE UPDATE ON entitlements BEGIN SELECT RAISE(ABORT,'simulated failure'); END");
  assert.equal((await webhook(env)).status,500);
  assert.equal(env._state.events.size,0);
  env._sqlite.exec('DROP TRIGGER fail_grant');
  assert.equal((await webhook(env)).status,200);
  assert.equal(env._state.entitlements.get('acc_security').status,'active');
});
test('duplicate concurrent webhooks are idempotent and succeed',async t=>{
  const {env}=setup(t);seedAccount(env);
  const r=await Promise.all([1,2,3].map(()=>webhook(env)));
  assert.deepEqual(r.map(x=>x.status),[200,200,200]);
  assert.equal(env._state.events.size,1);
});
test('different events for the same checkout session cannot extend access',async t=>{
  const {env}=setup(t);seedAccount(env);
  assert.equal((await webhook(env)).status,200);
  const until=env._state.entitlements.get('acc_security').valid_until;
  const realNow=Date.now;t.mock.method(Date,'now',()=>realNow()+10000);
  assert.equal((await webhook(env,{id:'evt_second',type:'checkout.session.async_payment_succeeded'})).status,200);
  assert.equal(env._state.entitlements.get('acc_security').valid_until,until);
});

test('email provider failure leaves no redeemable token and never logs a link',async t=>{
  const {env}=setup(t);const logs=[];
  t.mock.method(console,'log',(...args)=>logs.push(args));
  t.mock.method(globalThis,'fetch',async()=>new Response('{}',{status:429}));
  assert.equal((await worker.fetch(request('/auth/request',{email:'audit@example.invalid'}),env)).status,503);
  assert.equal(env._sqlite.prepare('SELECT count(*) AS n FROM magic_tokens').get().n,0);
  assert.equal(logs.length,0);
});
test('source limit cannot be bypassed with X-Forwarded-For when trusted source is absent',async t=>{
  const {env,mail}=setup(t,{AUTH_IP_LIMIT:'2'});
  for(let i=0;i<5;i++) {
    const r=request('/auth/request',{email:`audit${i}@example.invalid`});
    r.headers.delete('CF-Connecting-IP');r.headers.set('X-Forwarded-For',`192.0.2.${i}`);
    await worker.fetch(r,env);
  }
  assert.equal(mail.length,2);
});
test('email limit allows requests in the next fixed window',async t=>{
  const {env,mail}=setup(t,{AUTH_EMAIL_LIMIT:'1'});
  const now=1800000000000;t.mock.method(Date,'now',()=>now);
  await link(env,mail);await worker.fetch(request('/auth/request',{email:'audit@example.invalid'}),env);
  assert.equal(mail.length,1);
  t.mock.method(Date,'now',()=>now+900000);
  await link(env,mail);assert.equal(mail.length,2);
});
test('different fresh links for a new account can be redeemed concurrently',async t=>{
  const {env,mail}=setup(t);
  const tokens=[await link(env,mail),await link(env,mail)];
  const r=await Promise.all(tokens.map(token=>worker.fetch(request('/auth/verify',{token}),env)));
  assert.deepEqual(r.map(x=>x.status),[200,200]);
  assert.equal(env._state.accounts.size,1);assert.equal(env._state.sessions.size,2);
});
test('legacy shared-environment sessions are rejected without deleting the account',async t=>{
  const {env}=setup(t);seedAccount(env);
  env._sqlite.prepare('INSERT INTO sessions(session_id,account_id,created_at,expires_at) VALUES (?,?,?,?)').run('ses_legacy','acc_security',1,Date.now()+100000);
  assert.equal((await worker.fetch(new Request('https://api.test/me',{headers:{Authorization:'Bearer ses_legacy'}}),env)).status,401);
  assert.equal(env._state.accounts.size,1);
});
test('expired session at exact deadline is rejected',async t=>{
  const {env}=setup(t);seedAccount(env);const now=Date.now();t.mock.method(Date,'now',()=>now);
  env._sqlite.prepare('INSERT INTO sessions(session_id,account_id,created_at,expires_at,environment) VALUES (?,?,?,?,?)').run('ses_expired','acc_security',1,now,'production');
  assert.equal((await worker.fetch(new Request('https://api.test/me',{headers:{Authorization:'Bearer ses_expired'}}),env)).status,401);
});
test('unknown checkout account rolls back deduplication records',async t=>{
  const {env}=setup(t);
  assert.equal((await webhook(env)).status,500);
  assert.equal(env._state.events.size,0);
  assert.equal(env._sqlite.prepare('SELECT count(*) AS n FROM checkout_fulfillments').get().n,0);
});
test('source-blocked requests cannot exhaust the daily allowance for other parents',async t=>{
  const {env,mail}=setup(t,{AUTH_IP_LIMIT:'1',AUTH_DAILY_LIMIT:'3'});
  for(let i=0;i<6;i++) await worker.fetch(request('/auth/request',{email:`blocked${i}@example.invalid`}),env);
  await worker.fetch(request('/auth/request',{email:'other@example.invalid'},'192.0.2.2'),env);
  assert.equal(mail.length,2);
});
