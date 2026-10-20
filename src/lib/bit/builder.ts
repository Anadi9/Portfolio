/**
 * The "build your own package" list, from the six packages on the homepage.
 * The audit is the only published price; everything else is quoted per
 * project, so the builder collects the picks and Anadi replies with one fixed
 * quote. No totals: a sum of ranges would read as a price.
 */
import { site } from '@/data/portfolio';

export type PackageId = 'paudit' | 'sprint' | 'rescue' | 'aifeat' | 'mvp' | 'care';

/** `price` is what the pricing section shows for the package. */
export type Package = { id: PackageId; name: string; price: string };

export const PACKAGES: Package[] = [
  { id: 'paudit', name: 'Production audit', price: '$349' },
  { id: 'sprint', name: 'Launch-ready sprint', price: 'Fixed quote' },
  { id: 'rescue', name: 'Full rescue', price: 'Fixed quote' },
  { id: 'aifeat', name: 'AI build', price: 'Fixed quote' },
  { id: 'mvp', name: 'MVP build', price: 'Fixed quote' },
  { id: 'care', name: 'Care plan', price: 'Quoted monthly' },
];

/** The picked packages, in the homepage's order. */
export const pickedPackages = (picked: Iterable<PackageId>): Package[] => {
  const ids = new Set(picked);
  return PACKAGES.filter((p) => ids.has(p.id));
};

/** The request as a real email to Anadi. Nothing is sent from the page. */
export function builderMailto(picked: Iterable<PackageId>) {
  const lines = pickedPackages(picked).map((p) => `- ${p.name}`);
  const body = ['Hi Anadi,', '', 'I built this package on your site:', '', ...lines, '', 'Please send me a fixed quote.', '', 'App link: ', ''].join('\n');
  return `mailto:${site.email}?subject=${encodeURIComponent('Custom package')}&body=${encodeURIComponent(body)}`;
}
