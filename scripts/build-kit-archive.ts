import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildKitArchive } from '../src/lib/kit/archive';
import { KIT } from '../src/lib/kit/product';

/**
 * Zips `products/production-kit` into `worker/generated/production-kit.zip`,
 * which the Worker bundles as data (`wrangler.jsonc` rules) for
 * `/api/production-kit-download`. Same zip the Vercel function builds on
 * request: `buildKitArchive` is the one implementation. Run with vite-node.
 */

const out = join(process.cwd(), 'worker', 'generated', `${KIT.archive}.zip`);
mkdirSync(join(process.cwd(), 'worker', 'generated'), { recursive: true });
const zip = buildKitArchive(join(process.cwd(), 'products', KIT.archive));
writeFileSync(out, zip);
console.log(`[kit-archive] wrote ${out} (${zip.byteLength} bytes)`);
