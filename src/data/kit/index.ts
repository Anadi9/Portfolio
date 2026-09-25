import r1_2_0 from './releases/1.2.0.js';
import type { Pack, PackId, Release } from './types.js';

export type { Pack, PackId, Release } from './types.js';

/**
 * The kit's catalog: every release that has been published, newest first.
 *
 * Each release is its manifest, copied in by `scripts/kit-add-release.mjs`. The
 * zips live in private storage at `kit/<version>/<zip>` and are never removed,
 * so a buyer can download every version of what they own.
 *
 * Prices are not here. The manifest's `priceUsdCents` is a suggestion; what the
 * page shows and the checkout charges comes from Stripe, found by lookup key.
 */
export const RELEASES: readonly Release[] = [r1_2_0];

export const LATEST = RELEASES[0];

/** Display order: the full kit first, then the packs as the manifest lists them. */
export const PACK_IDS: readonly PackId[] = LATEST.packs.map((p) => p.id);

/** Each pack's Stripe Price, by lookup key. `scripts/fetch-kit-prices.mjs` lists the same keys. */
export const LOOKUP_KEYS: Record<PackId, string> = {
  full: 'kit_full',
  'data-security': 'kit_data_security',
  auth: 'kit_auth',
  launch: 'kit_launch',
  'ai-discipline': 'kit_ai_discipline',
  'lovable-bolt': 'kit_lovable_bolt',
};

export const isPackId = (v: unknown): v is PackId => typeof v === 'string' && Object.prototype.hasOwnProperty.call(LOOKUP_KEYS, v);

export const packForLookupKey = (key: string | null | undefined): PackId | undefined =>
  (Object.keys(LOOKUP_KEYS) as PackId[]).find((id) => LOOKUP_KEYS[id] === key);

/** A pack as the latest release describes it. */
export const pack = (id: PackId): Pack => LATEST.packs.find((p) => p.id === id)!;

/** Every release that contains this pack, newest first. */
export const releasesOf = (id: PackId): { version: string; pack: Pack }[] =>
  RELEASES.flatMap((r) => {
    const found = r.packs.find((p) => p.id === id);
    return found ? [{ version: r.version, pack: found }] : [];
  });

/** Where a release's zip sits in the private bucket. */
export const STORAGE_BUCKET = 'products';
export const storagePath = (version: string, zip: string) => `kit/${version}/${zip}`;
