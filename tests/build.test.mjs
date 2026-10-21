import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';
import { buildSite, expectedFiles, PRODUCTION_API_BASE, ROOT } from '../scripts/build-site.mjs';

const STAGING = 'https://brightspark-worker-staging.brightspark.workers.dev';
const temp = mkdtempSync(join(tmpdir(), 'brightspark-site-'));
const prodDir = join(temp, 'prod');
const stagingDir = join(temp, 'staging');
test.after(() => rmSync(temp, { recursive: true, force: true }));

test('production build publishes only allowlisted public assets', async () => {
  const { files } = await buildSite({ outDir: prodDir });
  assert.deepEqual(files, expectedFiles());
  for (const file of files) assert.doesNotMatch(file, /\.md$|^worker\/|^tests\/|^docs\/|^scripts\/|package|\.security-backups|ECONOMICS/);
  assert.equal(readFileSync(join(prodDir, 'CNAME'), 'utf8').trim(), 'brightsparkprep.com');
});

test('bundle is valid, minified and points at production', () => {
  const bundle = readFileSync(join(prodDir, 'js/main.js'), 'utf8');
  execFileSync(process.execPath, ['--check', join(prodDir, 'js/main.js')]);
  assert.equal(bundle.split(PRODUCTION_API_BASE).length, 2);
  assert.doesNotMatch(bundle, /^import |\bimport\(/m, 'all modules are bundled');
  assert.ok(bundle.split('\n').length < 20, 'bundle is minified');
});

test('data files keep identical content after minification', () => {
  for (const file of ['curated.json', 'fixits.json'])
    assert.deepEqual(JSON.parse(readFileSync(join(prodDir, 'data', file), 'utf8')), JSON.parse(readFileSync(join(ROOT, 'data', file), 'utf8')));
});

test('staging build swaps only the API base', async () => {
  await buildSite({ outDir: stagingDir, apiBase: STAGING });
  const bundle = readFileSync(join(stagingDir, 'js/main.js'), 'utf8');
  assert.ok(!bundle.includes(PRODUCTION_API_BASE));
  assert.equal(bundle, readFileSync(join(prodDir, 'js/main.js'), 'utf8').replace(PRODUCTION_API_BASE, STAGING));
});

test('build refuses to overwrite the repository root', async () => {
  await assert.rejects(buildSite({ outDir: ROOT }), /Refusing/);
});

test('built app boots and renders every screen', async () => {
  const html = readFileSync(join(prodDir, 'app.html'), 'utf8');
  const dom = new JSDOM(html, { url: 'https://brightsparkprep.com/app.html#/home', pretendToBeVisual: true });
  const { window } = dom;
  const errors = [];
  for (const key of ['window', 'document', 'location', 'localStorage', 'sessionStorage', 'navigator', 'HTMLElement', 'Node', 'Event', 'requestAnimationFrame'])
    Object.defineProperty(globalThis, key, { value: key === 'window' ? window : window[key], configurable: true, writable: true });
  window.scrollTo = () => {};
  const originalError = console.error;
  console.error = (...args) => errors.push(args.map(String).join(' '));
  globalThis.fetch = async url => {
    const path = new URL(String(url), 'https://brightsparkprep.com/').pathname;
    if (path.startsWith('/data/')) return new Response(readFileSync(join(prodDir, path)), { headers: { 'content-type': 'application/json' } });
    if (path === '/config') return Response.json({ freeEra: true, paymentsEnabled: false, consentVersion: '1' });
    return new Response('{}', { status: 401 });
  };
  const settle = () => new Promise(resolve => setTimeout(resolve, 50));
  try {
    await import(pathToFileURL(join(prodDir, 'js/main.js')).href);
    await settle();
    for (const screen of ['home', 'topics', 'review', 'mock', 'worksheet', 'parent', 'account', 'signup']) {
      window.location.hash = `#/${screen}`;
      await settle();
      const text = document.getElementById('app').textContent;
      assert.ok(text.trim().length > 0 && !text.startsWith('Loading'), `${screen} rendered`);
      assert.doesNotMatch(text, /Something went wrong/, `${screen} has no render error`);
    }
    for (const quiz of ['#/quiz', '#/quiz/place-value']) {
      window.location.hash = quiz;
      await settle();
      assert.doesNotMatch(document.getElementById('app').textContent, /Something went wrong/);
      assert.ok(document.querySelector('.choice, input'), `${quiz} shows a question`);
    }
    assert.deepEqual(errors, []);
  } finally {
    console.error = originalError;
    window.close();
  }
});
