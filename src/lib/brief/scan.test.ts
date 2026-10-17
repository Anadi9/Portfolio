import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanLead } from './scan';

const report = {
  url: 'https://a.example/',
  score: 62,
  findings: [],
  bots: [],
  topFixes: [
    { id: 'render', label: 'Content in HTML', status: 'fail', weight: 30, detail: 'd', fix: 'Prerender' },
    { id: 'meta', label: 'Titles', status: 'warn', weight: 5, detail: 'd' },
  ],
};
const page = { url: 'https://a.example/', status: 200, type: 'text/html', body: '', headers: { 'strict-transport-security': 'max-age=1' } };

afterEach(() => vi.useRealTimers());

describe('scanLead', () => {
  it('needs an app link', async () => {
    expect(await scanLead(null)).toMatchObject({ ok: false, url: null, error: 'no app link' });
    expect(await scanLead('   ')).toMatchObject({ ok: false, error: 'no app link' });
  });

  it('passes on a failed check', async () => {
    const runCheck = vi.fn().mockResolvedValue({ ok: false, status: 502, error: 'turned away (403)' });
    const r = await scanLead('https://a.example', { runCheck, safeGet: vi.fn().mockResolvedValue(page) });
    expect(r).toMatchObject({ ok: false, error: 'turned away (403)' });
  });

  it('copies the score, top fixes and headers', async () => {
    const runCheck = vi.fn().mockResolvedValue({ ok: true, report });
    const r = await scanLead('https://a.example', { runCheck, safeGet: vi.fn().mockResolvedValue(page) });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.readiness.score).toBe(62);
    expect(r.readiness.topFixes).toEqual([
      { id: 'render', label: 'Content in HTML', fix: 'Prerender' },
      { id: 'meta', label: 'Titles' },
    ]);
    expect(r.headers.present).toContain('Strict-Transport-Security');
    expect(r.headers.missing.length).toBeGreaterThan(0);
  });

  it('fetches a bare host over https', async () => {
    const runCheck = vi.fn().mockResolvedValue({ ok: true, report });
    const safeGet = vi.fn().mockResolvedValue(page);
    await scanLead('antasignal.vercel.app', { runCheck, safeGet });
    expect(runCheck).toHaveBeenCalledWith('https://antasignal.vercel.app');
    expect(safeGet).toHaveBeenCalledWith('https://antasignal.vercel.app');
  });

  it('still reports readiness when the header fetch fails', async () => {
    const runCheck = vi.fn().mockResolvedValue({ ok: true, report });
    const r = await scanLead('https://a.example', { runCheck, safeGet: vi.fn().mockRejectedValue(new Error('x')) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.headers).toBeNull();
  });

  it('gives up after 15 seconds', async () => {
    vi.useFakeTimers();
    const never = () => new Promise<never>(() => {});
    const p = scanLead('https://a.example', { runCheck: never, safeGet: never });
    await vi.advanceTimersByTimeAsync(15_001);
    expect(await p).toMatchObject({ ok: false, error: 'scan timed out' });
  });
});
