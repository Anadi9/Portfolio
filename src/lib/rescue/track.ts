import { track } from '@vercel/analytics';

/**
 * Conversion events for the rescue funnel: `audit_cta_click` on `/` (the
 * homepage, which is the rescue page) and `audit_submitted` on `/rescue/audit`.
 *
 * Kept out of `intake.ts`, which has to stay dependency-free for the serverless
 * function. Both callers only fire from event handlers, so this never runs in
 * the prerender pass; the `window` guard and the catch are there anyway,
 * because a blocked or missing analytics script must never cost a lead.
 */
export type RescueEvent =
  | { name: 'audit_cta_click'; props: { location: string } }
  | { name: 'audit_submitted'; props: { tool: string; symptoms: number } };

export function trackRescue<E extends RescueEvent>(name: E['name'], props: E['props']): void {
  if (typeof window === 'undefined') return;
  try {
    track(name, props);
  } catch {
    // Analytics is best-effort.
  }
}
