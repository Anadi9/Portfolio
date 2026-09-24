import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { zipSync, type Zippable } from 'fflate';
import { KIT } from './product.js';

/**
 * Zips `products/production-kit` on request rather than shipping a built zip.
 *
 * The folder is the product, so what a buyer downloads is always what is in the
 * repo at that deploy: an edit to a skill reaches the next download with no
 * separate build step to forget. It is a few dozen small text files, so the
 * cost is a few milliseconds.
 *
 * The sales copy sits in the same folder and is left out: a buyer has no use
 * for the pitch they already said yes to.
 */

const EXCLUDE = new Set(['SALES-PAGE.md']);

export function buildKitArchive(dir: string): Uint8Array {
  const files: Zippable = {};
  const walk = (at: string) => {
    for (const name of readdirSync(at).sort()) {
      if (name.startsWith('.') || EXCLUDE.has(name)) continue;
      const path = join(at, name);
      if (statSync(path).isDirectory()) walk(path);
      else files[`${KIT.archive}/${relative(dir, path).split('\\').join('/')}`] = readFileSync(path);
    }
  };
  walk(dir);
  return zipSync(files, { level: 9 });
}
