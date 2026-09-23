// Copy only public assets. Production sources/API configuration are untouched.
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../../', import.meta.url);
const output = new URL('../.staging-site/', import.meta.url);
mkdirSync(output, { recursive: true });
for (const path of ['index.html','app.html','privacy.html','terms.html','style.css','js','data'])
  cpSync(new URL(path, root), new URL(path, output), { recursive: true });
const config = new URL('js/config.js', output);
const source = readFileSync(config, 'utf8');
const production = 'https://brightspark-worker-production.brightspark.workers.dev';
if (!source.includes(production)) throw new Error('Unexpected frontend API base');
writeFileSync(config, source.replace(production, 'https://brightspark-worker-staging.brightspark.workers.dev'));
writeFileSync(new URL('_headers', output), '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n');
console.log('Staging public assets prepared with isolated API base.');
