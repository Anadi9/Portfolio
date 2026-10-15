/**
 * The "build your own package" sum, from the six fixed-price packages on the
 * homepage. Pure so the arithmetic is tested, not eyeballed: one-off work is
 * a range, Care is monthly, and the $349 audit is credited in full once any
 * fix or build is picked alongside it (as the pricing section promises).
 */
import { site } from '@/data/portfolio';

export type PackageId = 'paudit' | 'sprint' | 'rescue' | 'aifeat' | 'mvp' | 'care';

export type Package = { id: PackageId; name: string; min: number; max: number; monthly?: boolean };

export const PACKAGES: Package[] = [
  { id: 'paudit', name: 'Production audit', min: 349, max: 349 },
  { id: 'sprint', name: 'Launch-ready sprint', min: 1500, max: 2500 },
  { id: 'rescue', name: 'Full rescue', min: 3000, max: 6000 },
  { id: 'aifeat', name: 'AI build', min: 2000, max: 8000 },
  { id: 'mvp', name: 'MVP build', min: 6000, max: 20000 },
  { id: 'care', name: 'Care plan', min: 299, max: 299, monthly: true },
];

const AUDIT = 349;

export type Total = { min: number; max: number; credit: number; monthly: number; count: number };

export function total(picked: Iterable<PackageId>): Total {
  const ids = new Set(picked);
  const chosen = PACKAGES.filter((p) => ids.has(p.id));
  const oneOff = chosen.filter((p) => !p.monthly);
  const credit = ids.has('paudit') && oneOff.some((p) => p.id !== 'paudit') ? AUDIT : 0;
  return {
    min: oneOff.reduce((n, p) => n + p.min, 0) - credit,
    max: oneOff.reduce((n, p) => n + p.max, 0) - credit,
    credit,
    monthly: chosen.filter((p) => p.monthly).reduce((n, p) => n + p.min, 0),
    count: chosen.length,
  };
}

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`;

/** "$1,500–$2,500", "$349", or "" when nothing one-off is picked. */
export const range = (t: Total) => (t.max === 0 ? '' : t.min === t.max ? usd(t.min) : `${usd(t.min)}–${usd(t.max)}`);

/** The request as a real email to Anadi. Nothing is sent from the page. */
export function builderMailto(picked: Iterable<PackageId>) {
  const ids = new Set(picked);
  const t = total(ids);
  const lines = PACKAGES.filter((p) => ids.has(p.id)).map((p) => `- ${p.name}: ${p.min === p.max ? usd(p.min) : `${usd(p.min)}–${usd(p.max)}`}${p.monthly ? '/mo' : ''}`);
  const sums = [
    range(t) && `One-off: ${range(t)}${t.credit ? ` (audit credited, -${usd(t.credit)})` : ''}`,
    t.monthly && `Monthly: ${usd(t.monthly)}/mo`,
  ].filter(Boolean);
  const body = ['Hi Anadi,', '', 'I built this package on your site:', '', ...lines, '', ...sums, '', 'App link: ', ''].join('\n');
  return `mailto:${site.email}?subject=${encodeURIComponent('Custom package')}&body=${encodeURIComponent(body)}`;
}
