// Runs last in `npm run build`. Writes the IndexNow key file when INDEXNOW_KEY
// is set, and pings api.indexnow.org with every sitemap URL on production
// builds only. Never fails the build.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { indexNowPayload, shouldPing, sitemapUrls } from './lib/indexnow.mjs';

const OUT = join(process.cwd(), 'dist');
const key = process.env.INDEXNOW_KEY ?? '';

try {
  if (/^[a-f0-9]{8,128}$/i.test(key)) writeFileSync(join(OUT, `${key}.txt`), key);
  if (!shouldPing(process.env)) {
    console.log('[indexnow] skipped (production build with INDEXNOW_KEY only)');
  } else if (!existsSync(join(OUT, 'sitemap.xml'))) {
    console.log('[indexnow] skipped: no sitemap');
  } else {
    const urls = sitemapUrls(readFileSync(join(OUT, 'sitemap.xml'), 'utf8'));
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(indexNowPayload(key, urls)),
      signal: AbortSignal.timeout(10_000),
    });
    console.log(`[indexnow] ${urls.length} urls → ${res.status}`);
  }
} catch (err) {
  console.warn('[indexnow] failed, build continues:', err instanceof Error ? err.message : err);
}
