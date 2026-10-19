/** The shape of a kit release's `manifest.json`, as the kit's build writes it. */

export type PackId = 'full' | 'data-security' | 'auth' | 'launch' | 'ai-discipline' | 'lovable-bolt';

export type Pack = {
  id: PackId;
  name: string;
  tagline: string;
  /** The problem the pack answers, in the buyer's words. The pain cards' headline. */
  problem: string;
  /** From the manifest, from when the packs were sold. Not shown or charged. */
  priceUsdCents: number;
  zip: string;
  bytes: number;
  sha256: string;
  files: string[];
  mentionsOutsidePack: string[];
};

export type Release = {
  version: string;
  builtAt: string;
  upgradeUrl: string;
  packs: Pack[];
};
