import r1_2_1 from './releases/1.2.1.js';
import r1_2_0 from './releases/1.2.0.js';
import type { Pack, PackId, Release } from './types.js';

export type { Pack, PackId, Release } from './types.js';

/**
 * The kit's catalog: every release that has been published, newest first.
 *
 * Each release is its manifest, copied in by `scripts/kit-add-release.mjs`.
 * The kit is free: the page offers the latest full-kit zip as a static file
 * (`FREE_KIT` below). The packs are kept as the manifest describes them, for the
 * page's list of the problems each one covers.
 */
export const RELEASES: readonly Release[] = [r1_2_1, r1_2_0];

export const LATEST = RELEASES[0];

/** Display order: the full kit first, then the packs as the manifest lists them. */
export const PACK_IDS: readonly PackId[] = LATEST.packs.map((p) => p.id);

/** A pack as the latest release describes it. */
export const pack = (id: PackId): Pack => LATEST.packs.find((p) => p.id === id)!;

/**
 * The full kit as a free, public download.
 *
 * The latest release's full-kit zip, copied as-is into `public/downloads/` so
 * it is a static file with no account, token or checkout in front of it.
 * `free.test.ts` fails if the file there stops matching this manifest, so a new
 * release can't ship with a stale zip.
 */
export const FREE_KIT = (() => {
  const full = pack('full');
  return { version: LATEST.version, zip: full.zip, href: `/downloads/${full.zip}`, bytes: full.bytes, sha256: full.sha256 };
})();
