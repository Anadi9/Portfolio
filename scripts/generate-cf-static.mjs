import { readFileSync, writeFileSync } from 'node:fs';
import { toCloudflareStatic } from './lib/cf-static.mjs';

/**
 * Writes `dist/_headers` and `dist/_redirects` for Cloudflare from `vercel.json`
 * (see `scripts/lib/cf-static.mjs`). Runs after the build; fails it if a file
 * would pass Cloudflare's limits, since Cloudflare would ignore the extra rules.
 */

const LIMITS = { headers: 100, redirects: 2100 };

const out = toCloudflareStatic(JSON.parse(readFileSync('vercel.json', 'utf8')));
const headerRules = out.headers.split('\n').filter((l) => l.startsWith('/')).length;
const redirectRules = out.redirects.split('\n').filter(Boolean).length;
if (headerRules > LIMITS.headers || redirectRules > LIMITS.redirects) {
  console.error(`[cf-static] over Cloudflare's limits: ${headerRules} header rules, ${redirectRules} redirects`);
  process.exit(1);
}

writeFileSync('dist/_headers', out.headers);
writeFileSync('dist/_redirects', out.redirects);
console.log(`[cf-static] wrote ${headerRules} header rules and ${redirectRules} redirects; host rules left to the Worker: ${out.skipped.join(', ')}`);
