// Build the public site with the shared production build, pointed at the
// staging API. Production sources/API configuration are untouched.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../../scripts/build-site.mjs';
const output = fileURLToPath(new URL('../.staging-site/', import.meta.url));
await buildSite({ outDir: output, apiBase: 'https://brightspark-worker-staging.brightspark.workers.dev' });
writeFileSync(new URL('_headers', `file://${output}`), '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n');
console.log('Staging public assets prepared with isolated API base.');
