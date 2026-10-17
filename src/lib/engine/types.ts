/**
 * The one shape every check reports in: the lead scan, the Supabase security
 * scan, the DPDP self-check and the Wrapper Test. Ranked by business impact.
 */

export const AREAS = ['reliability', 'security', 'visibility', 'privacy', 'product'] as const;
export type Area = (typeof AREAS)[number];

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type EngineFinding = {
  area: Area;
  severity: Severity;
  title: string;
  detail: string;
  fix: string | null;
  source: 'readiness' | 'headers' | 'supabase' | 'dpdp' | 'teardown';
};

export const AREA_LABEL: Record<Area, string> = {
  reliability: 'Reliability',
  security: 'Security',
  visibility: 'Search and AI visibility',
  privacy: 'Privacy (GDPR · CCPA · DPDP)',
  product: 'Product depth',
};
