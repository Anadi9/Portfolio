/**
 * Browser error reporter. Tiny and dependency-free. Dedupes by message+source+line
 * and caps at 5 reports per page view. Skipped on the portfolio host.
 */
export const PORTFOLIO_HOST = 'portfolio.anadithakur.in';
export const MAX_REPORTS = 5;
const ENDPOINT = '/api/client-error';

export type Payload = { message: string; source?: string; line?: number; col?: number; stack?: string; path: string };

export function createReporter(send: (p: Payload) => void, path: () => string) {
  const seen = new Set<string>();
  return function report(p: Omit<Payload, 'path'>) {
    if (seen.size >= MAX_REPORTS || !p.message) return;
    const key = `${p.message}|${p.source ?? ''}|${p.line ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    send({
      ...p,
      message: p.message.slice(0, 500),
      source: p.source?.slice(0, 300),
      stack: p.stack?.slice(0, 2000),
      path: path().slice(0, 200) || '/',
    });
  };
}

function transport(p: Payload) {
  const body = JSON.stringify(p);
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      void fetch(ENDPOINT, { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  } catch {
    /* reporting must never throw */
  }
}

const num = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n : undefined);

export function installErrorReporter() {
  if (typeof window === 'undefined' || window.location.hostname === PORTFOLIO_HOST) return;
  const report = createReporter(transport, () => window.location.pathname);
  window.addEventListener('error', (e) => {
    report({
      message: String(e.message || 'error'),
      source: e.filename || undefined,
      line: num(e.lineno),
      col: num(e.colno),
      stack: e.error instanceof Error ? e.error.stack : undefined,
    });
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    report({ message: r instanceof Error ? r.message || r.name : String(r), stack: r instanceof Error ? r.stack : undefined });
  });
}
