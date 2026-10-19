/**
 * Funnel events, sent to our own `/api/event` (`src/server/event.ts`) instead of
 * a paid analytics plan. Same call shape as `@vercel/analytics`' `track`, so the
 * call sites didn't change.
 *
 * Browser only, and best-effort: it never throws, and `sendBeacon` lets the
 * event survive the navigation the click starts. Nothing identifies the
 * visitor: name, props, and the page path.
 */

export type EventProps = Record<string, string | number | boolean>;

export function track(name: string, props: EventProps = {}): void {
  if (typeof window === 'undefined') return;
  try {
    const body = JSON.stringify({ name, props, path: window.location.pathname });
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/event', blob)) return;
    void fetch('/api/event', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
  } catch {
    // Analytics is best-effort.
  }
}
