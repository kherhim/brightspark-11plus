// Build the public website into a controlled output directory.
// Only allowlisted assets are published; everything else in the repo
// (docs, tests, worker, notes, package files) stays out of the site.
//   node scripts/build-site.mjs [outDir] [--report]
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const PRODUCTION_API_BASE = 'https://brightspark-worker-production.brightspark.workers.dev';
export const PAGES = ['index.html', 'app.html', 'privacy.html', 'terms.html'];
const STATIC = ['CNAME'];

// Every file the published site may contain. Anything else is a build error.
export function expectedFiles(dataFiles = readdirSync(join(ROOT, 'data'))) {
  return [...PAGES, ...STATIC, 'style.css', 'js/main.js', ...dataFiles.map(f => `data/${f}`)].sort();
}

export function listFiles(dir, base = dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? listFiles(path, base) : [relative(base, path)];
  }).sort();
}

export async function buildSite({ outDir = join(ROOT, 'dist'), apiBase = PRODUCTION_API_BASE, minify = true } = {}) {
  outDir = resolve(outDir);
  if (outDir === ROOT || ROOT.startsWith(outDir + '/')) throw new Error(`Refusing to build into ${outDir}`);
  const configSource = readFileSync(join(ROOT, 'js/config.js'), 'utf8');
  if (configSource.split(PRODUCTION_API_BASE).length !== 2) throw new Error('Expected exactly one production API base in js/config.js');

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'data'), { recursive: true });
  for (const file of [...PAGES, ...STATIC]) cpSync(join(ROOT, file), join(outDir, file));

  // One ES module: the app has no dynamic imports, so bundling is not code
  // splitting; it replaces ~60 module requests with one.
  await build({
    entryPoints: [join(ROOT, 'js/main.js')],
    outfile: join(outDir, 'js/main.js'),
    bundle: true, format: 'esm', target: 'es2020', minify, legalComments: 'none', logLevel: 'warning',
  });
  await build({
    entryPoints: [join(ROOT, 'style.css')],
    outfile: join(outDir, 'style.css'),
    minify, logLevel: 'warning',
  });
  for (const file of readdirSync(join(ROOT, 'data'))) {
    const json = JSON.parse(readFileSync(join(ROOT, 'data', file), 'utf8'));
    writeFileSync(join(outDir, 'data', file), minify ? JSON.stringify(json) : JSON.stringify(json, null, 2) + '\n');
  }

  const bundlePath = join(outDir, 'js/main.js');
  const bundle = readFileSync(bundlePath, 'utf8');
  if (bundle.split(PRODUCTION_API_BASE).length !== 2) throw new Error('Expected exactly one API base in the bundle');
  if (apiBase !== PRODUCTION_API_BASE) writeFileSync(bundlePath, bundle.replace(PRODUCTION_API_BASE, apiBase));

  const actual = listFiles(outDir);
  const expected = expectedFiles();
  if (JSON.stringify(actual) !== JSON.stringify(expected))
    throw new Error(`Unexpected site contents:\n  got ${actual.join(', ')}\n  want ${expected.join(', ')}`);
  return { outDir, files: actual };
}

function measure(paths) {
  let raw = 0, gzip = 0;
  for (const path of paths) {
    const bytes = readFileSync(path);
    raw += bytes.length;
    gzip += gzipSync(bytes, { level: 9 }).length;
  }
  return { files: paths.length, raw, gzip };
}

// Bytes a first visit to app.html downloads: source tree vs built site.
export function sizeReport(outDir) {
  const groups = {
    js: [listFiles(join(ROOT, 'js')).map(f => join(ROOT, 'js', f)), [join(outDir, 'js/main.js')]],
    css: [[join(ROOT, 'style.css')], [join(outDir, 'style.css')]],
    data: [listFiles(join(ROOT, 'data')).map(f => join(ROOT, 'data', f)), listFiles(join(outDir, 'data')).map(f => join(outDir, 'data', f))],
  };
  return Object.fromEntries(Object.entries(groups).map(([name, [before, after]]) => [name, { before: measure(before), after: measure(after) }]));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const outDir = args.find(a => !a.startsWith('--')) ?? join(ROOT, 'dist');
  const { files } = await buildSite({ outDir });
  console.log(`Built ${files.length} files into ${relative(ROOT, resolve(outDir)) || basename(outDir)}/`);
  if (args.includes('--report')) {
    const kb = n => (n / 1024).toFixed(1) + ' KB';
    for (const [name, { before, after }] of Object.entries(sizeReport(resolve(outDir))))
      console.log(`${name.padEnd(5)} ${before.files} files ${kb(before.raw)} (gzip ${kb(before.gzip)}) -> ${after.files} files ${kb(after.raw)} (gzip ${kb(after.gzip)})`);
  }
}
