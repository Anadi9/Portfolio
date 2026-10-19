import { join } from 'node:path';
import { buildKitArchive } from './archive.js';
import { KIT } from './product.js';

/**
 * The kit zip for `/api/production-kit-download`.
 *
 * On Cloudflare there is no project folder to read at request time, so the
 * build zips `products/production-kit` (`scripts/build-kit-archive.ts`) and the
 * Worker hands the bytes in with `setKitArchive` at start-up. Anywhere else
 * (Vercel, `npm run dev`) it zips the folder on request, as before.
 */

let injected: Uint8Array | undefined;

export function setKitArchive(bytes: Uint8Array): void {
  injected = bytes;
}

export function kitArchive(): Uint8Array {
  return injected ?? buildKitArchive(join(process.cwd(), 'products', KIT.archive));
}
