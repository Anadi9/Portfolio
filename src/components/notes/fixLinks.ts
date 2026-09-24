import { SYMPTOMS } from '@/lib/rescue/intake';

/**
 * Where a fix post's closing CTA points.
 *
 * The audit form reads ticked symptoms from `?s=` as indices into `SYMPTOMS`.
 * A post names its symptom by `area` instead (`Database`, `Deployment`), and
 * this resolves the name to whatever index that row has today. Rows get
 * inserted above the catch-all as the offer grows, and a hardcoded `?s=4` in
 * frontmatter would quietly start ticking the wrong box the day that happens.
 *
 * An unknown or missing area falls back to the bare form rather than throwing:
 * a CTA with nothing pre-ticked still converts, a broken build does not.
 */
export const AUDIT_PATH = '/rescue/audit';
export const SCAN_PATH = '/scan';

export const symptomIndex = (area?: string): number | null => {
  if (!area) return null;
  const i = SYMPTOMS.findIndex((row) => row.area.toLowerCase() === area.toLowerCase());
  return i === -1 ? null : i;
};

export const auditHref = (area?: string): string => {
  const i = symptomIndex(area);
  return i === null ? AUDIT_PATH : `${AUDIT_PATH}?s=${i}`;
};

/** The sentence the reader would have ticked, quoted back to them on the CTA. */
export const symptomLine = (area?: string): string | null => {
  const i = symptomIndex(area);
  return i === null ? null : SYMPTOMS[i].line;
};
