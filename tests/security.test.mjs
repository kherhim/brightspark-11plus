import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { renderSignup } from '../js/ui/screenSignup.js';
import { renderAccount } from '../js/ui/screenAccount.js';
import { renderReview } from '../js/ui/screenReview.js';
import { renderSolution } from '../js/ui/screenQuiz.js';
import { setServerConfig } from '../js/config.js';
import { setSession } from '../js/auth.js';
import { recordResult, recordMockOutcome } from '../js/engine.js';
import { freshState, importJSON, saveState } from '../js/store.js';
const payload = '<img src=x onerror=alert(1)>';
function setup() {
  const dom = new JSDOM('<main></main>', { url: 'https://example.test/app.html' });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.sessionStorage = dom.window.sessionStorage;
  setSession(null);
  setServerConfig({ freeEra: true, consentVersion: '1' });
  return { mount: document.querySelector('main'), state: freshState(), navigate() {}, save() {} };
}
const settle = () => new Promise(resolve => setTimeout(resolve, 50));
function inert(mount, value) {
  assert.equal(mount.querySelector('img, script, svg'), null, 'untrusted content must not create elements');
  assert.ok(mount.textContent.includes(value), 'untrusted text remains visible verbatim');
}
test('signup confirmation treats email markup as literal text', async () => {
  const ctx = setup();
  globalThis.fetch = async () => Response.json({ ok: true });
  renderSignup(ctx);
  const email = '<svg/onload=alert(1)>@example.com';
  ctx.mount.querySelector('input[type=email]').value = email;
  ctx.mount.querySelector('input[type=checkbox]').checked = true;
  ctx.mount.querySelector('button').click();
  await settle();
  inert(ctx.mount, email);
});
test('consent version remains text while legal links work', () => {
  const ctx = setup();
  setServerConfig({ consentVersion: payload });
  renderSignup(ctx);
  inert(ctx.mount, payload);
  assert.equal(ctx.mount.querySelector('a').getAttribute('href'), './terms.html');
});
test('account email and plan are plain text', async () => {
  const ctx = setup();
  setSession('test-session');
  globalThis.fetch = async () => Response.json({ authenticated: true, paid: true, email: payload, plan: payload, valid_until: null });
  renderAccount(ctx, []);
  await settle();
  inert(ctx.mount, payload);
  assert.equal(ctx.mount.textContent.split(payload).length - 1, 2);
});
test('paid URL flag cannot claim payment until server confirms entitlement', async () => {
  const ctx = setup();
  setSession('test-session');
  globalThis.fetch = async () => Response.json({ authenticated: true, paid: false, email: 'parent@example.com' });
  renderAccount(ctx, ['paid']);
  await settle();
  assert.doesNotMatch(ctx.mount.textContent, /Payment received|You're all set/);
  assert.match(ctx.mount.textContent, /confirm/i);
});
test('confirmed paid account still shows payment success', async () => {
  const ctx = setup();
  setSession('test-session');
  globalThis.fetch = async () => Response.json({ authenticated: true, paid: true, email: 'parent@example.com' });
  renderAccount(ctx, ['paid']);
  await settle();
  assert.match(ctx.mount.textContent, /Payment received/);
});
test('review renders imported child name as text', () => {
  const ctx = setup();
  ctx.state.profile.childName = payload;
  ctx.state.misconceptionCounts.f_add = 5;
  renderReview(ctx);
  inert(ctx.mount, payload);
});
test('stored answer text is inert and authored solution markup survives', () => {
  const ctx = setup();
  renderSolution({ explanation: 'Example', workedSteps: ['Use <b>addition</b>.'] }, payload).forEach(n => ctx.mount.appendChild(n));
  inert(ctx.mount, payload);
  assert.equal(ctx.mount.querySelector('ol b').textContent, 'addition');
});
for (const [name, mutate] of [
  ['unknown schema', s => { s.schemaVersion = 99; }],
  ['array profile', s => { s.profile = []; }],
  ['empty global counters', s => { s.global = {}; }],
  ['empty topic record', s => { s.topics.fractions = {}; }],
  ...['totalAnswered', 'totalCorrect', 'sessionCount'].map(key =>
    [`missing global ${key}`, s => { delete s.global[key]; }]),
  ...['level', 'streakCorrect', 'streakWrong', 'attempts', 'correct', 'mastery',
    'timeMs', 'lastSeenAt', 'seenCount', 'mastered'].map(key =>
    [`missing topic ${key}`, s => { delete s.topics.fractions[key]; }]),
  ['string level', s => { s.topics.fractions.level = payload; }],
  ['malformed mock items', s => { s.mockHistory = [{ items: 'bad' }]; }],
  ['null mistake', s => { s.mistakeLog = [null]; }],
  ['prototype key', s => { s.leitner.boxes = JSON.parse('{"__proto__":{}}'); }],
]) test(`import rejects ${name} without replacing saved progress`, () => {
  setup();
  const existing = freshState(); existing.global.totalAnswered = 37; saveState(existing);
  const before = window.localStorage.getItem('syon11plus.v3');
  const incoming = freshState(); mutate(incoming);
  assert.throws(() => importJSON(JSON.stringify(incoming)), /invalid|unsupported/i);
  assert.equal(window.localStorage.getItem('syon11plus.v3'), before);
});
test('valid legacy and current imports preserve progress and text', () => {
  setup();
  for (const version of [3, 4]) {
    const incoming = freshState(); incoming.schemaVersion = version;
    incoming.profile.childName = payload;
    incoming.topics.fractions.correct = 17;
    delete incoming.activity;
    const restored = importJSON(JSON.stringify(incoming));
    assert.equal(restored.topics.fractions.correct, 17);
    assert.equal(restored.profile.childName, payload);
    assert.equal(restored.schemaVersion, 4);
    assert.ok(window.localStorage.getItem('syon11plus.v3'));
  }
});

test('practice and mock progress exported by the engine imports without loss', () => {
  setup();
  const state = freshState();
  recordResult(state, 'fractions', {
    correct: false, level: 3, timeMs: 20000, qid: 'fractions:L3:s=1',
    seed: 1, templateId: 'fractions-test', chosenText: '3/4', correctText: '2/3',
    misconceptionId: 'f_add', source: 'practice',
  });
  recordMockOutcome(state, {
    id: 'mock-1', at: 1000, subject: 'maths', lengthQ: 1, timed: true,
    durationMs: 10000, scoreCorrect: 0, scoreTotal: 1, band: 'Working on it',
    sections: [{ topicId: 'fractions', correct: 0, total: 1 }],
    items: [{ topicId: 'fractions', level: 3, correct: false, timeMs: 10000,
      qid: 'fractions:L3:s=2', seed: 2, templateId: 'fractions-test', source: 'generated',
      chosenKey: null, chosenText: payload, correctText: '1/2', misconceptionId: null }],
  });
  const result = importJSON(JSON.stringify(state));
  assert.deepEqual(result.topics, state.topics);
  assert.deepEqual(result.mistakeLog, state.mistakeLog);
  assert.deepEqual(result.mockHistory, state.mockHistory);
  assert.deepEqual(result.leitner, state.leitner);
});
