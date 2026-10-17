import { describe, expect, it, vi } from 'vitest';
import { parseClientError } from './validate';
import { createReporter, installErrorReporter, MAX_REPORTS } from './report';
import { withErrorLog } from './with-error-log';
import { healthReport } from './health';

describe('parseClientError', () => {
  it('accepts a minimal and a full report', () => {
    expect(parseClientError({ message: 'x', path: '/' }).ok).toBe(true);
    expect(parseClientError({ message: 'x', source: 's', line: 1, col: 2, stack: 'st', path: '/a' }).ok).toBe(true);
  });
  it('rejects missing, oversized and extra (PII) fields', () => {
    expect(parseClientError({ path: '/' }).ok).toBe(false);
    expect(parseClientError({ message: 'x'.repeat(501), path: '/' }).ok).toBe(false);
    expect(parseClientError({ message: 'x', path: '/', email: 'a@b.c' }).ok).toBe(false);
    expect(parseClientError(null).ok).toBe(false);
  });
});

describe('createReporter', () => {
  it('dedupes and caps at 5', () => {
    const send = vi.fn();
    const r = createReporter(send, () => '/p');
    r({ message: 'same', source: 'a', line: 1 });
    r({ message: 'same', source: 'a', line: 1 });
    expect(send).toHaveBeenCalledTimes(1);
    for (let i = 0; i < 20; i++) r({ message: `m${i}` });
    expect(send).toHaveBeenCalledTimes(MAX_REPORTS);
    expect(send.mock.calls[0][0].path).toBe('/p');
  });
});

describe('installErrorReporter', () => {
  it('skips the portfolio host and reports on the main host', () => {
    for (const [host, expected] of [['portfolio.anadithakur.in', 0], ['anadithakur.in', 1]] as const) {
      const listeners: string[] = [];
      vi.stubGlobal('window', { location: { hostname: host, pathname: '/' }, addEventListener: (t: string) => listeners.push(t) });
      installErrorReporter();
      expect(listeners.length > 0 ? 1 : 0).toBe(expected);
      vi.unstubAllGlobals();
    }
  });
});

describe('withErrorLog', () => {
  const mkRes = (sent = false) => {
    const res: any = { headersSent: sent, status: vi.fn(() => res), json: vi.fn(() => res) };
    return res;
  };
  it('logs and responds 500', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mkRes();
    await withErrorLog('h', () => { throw new Error('boom'); })({} as any, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'internal error' });
    expect(spy.mock.calls[0][0]).toBe('[api-error]');
    expect(JSON.parse(spy.mock.calls[0][1] as string)).toMatchObject({ name: 'h', message: 'boom' });
    spy.mockRestore();
  });
  it('does not respond twice when headers were sent', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = mkRes(true);
    await withErrorLog('h', async () => { throw new Error('x'); })({} as any, res);
    expect(res.status).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('healthReport', () => {
  it('reports missing with no fetch when nothing is set', async () => {
    const f = vi.fn();
    const r = await healthReport({}, f);
    expect(r).toEqual({ ok: true, checks: { resend: 'missing', supabase: 'missing', whatsapp: 'missing', ai: 'missing' } });
    expect(f).not.toHaveBeenCalled();
  });
  it('checks supabase and never leaks values', async () => {
    const f = vi.fn(async () => ({ status: 200 }));
    const env = { RESEND_API_KEY: 'k', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SECRET_KEY: 'sekret', BIT_AI: 'on', AI_GATEWAY_API_KEY: 'g', WHATSAPP_TOKEN: 't' };
    const r = await healthReport(env, f);
    expect(r.checks).toEqual({ resend: 'configured', supabase: 'configured', whatsapp: 'missing', ai: 'configured' });
    expect(r.supabaseReachable).toBe('reachable');
    expect(JSON.stringify(r)).not.toContain('sekret');
  });
  it('whatsapp is configured only with all four variables', async () => {
    const all = { WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '1', WHATSAPP_ALERT_TO: '9', WHATSAPP_TEMPLATE_NEW_TICKET: 'n' };
    expect((await healthReport(all, vi.fn())).checks.whatsapp).toBe('configured');
    for (const k of Object.keys(all)) {
      const partial: Record<string, string> = { ...all };
      delete partial[k];
      expect((await healthReport(partial, vi.fn())).checks.whatsapp, k).toBe('missing');
    }
  });
  it('ai needs BIT_AI=on and gateway auth, the same rule Bit uses', async () => {
    const ai = async (env: Record<string, string>) => (await healthReport(env, vi.fn())).checks.ai;
    expect(await ai({ BIT_AI: 'on' })).toBe('missing');
    expect(await ai({ AI_GATEWAY_API_KEY: 'g' })).toBe('missing');
    expect(await ai({ BIT_AI: 'on', AI_GATEWAY_API_KEY: 'g' })).toBe('configured');
    expect(await ai({ BIT_AI: 'on', VERCEL_OIDC_TOKEN: 'o' })).toBe('configured');
    expect(await ai({ BIT_AI: 'on', VERCEL: '1' })).toBe('configured');
  });
  it('reports unreachable on failure', async () => {
    const r = await healthReport({ SUPABASE_URL: 'u', SUPABASE_SECRET_KEY: 'k' }, async () => { throw new Error('net'); });
    expect(r.supabaseReachable).toBe('unreachable');
  });
});

describe('healthReport outage and handler status', () => {
  const env = { SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SECRET_KEY: 'sekret' };
  it('is ok:false when supabase is unreachable (throw or 5xx), without leaking', async () => {
    const a = await healthReport(env, async () => { throw new Error('sekret down'); });
    const b = await healthReport(env, async () => ({ status: 503 }));
    for (const r of [a, b]) {
      expect(r.ok).toBe(false);
      expect(r.supabaseReachable).toBe('unreachable');
      expect(JSON.stringify(r)).not.toContain('sekret');
    }
  });
  it('maps to 503 when unreachable and 200 when missing env', async () => {
    const { default: handler } = await import('../../../api/health');
    const mkRes = () => {
      const res: any = { headersSent: false, setHeader: vi.fn(), status: vi.fn(() => res), json: vi.fn(() => res) };
      return res;
    };
    const saved = { ...process.env };
    try {
      Object.assign(process.env, env);
      vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('net'); }));
      let res = mkRes();
      await handler({ method: 'GET' } as any, res);
      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SECRET_KEY;
      res = mkRes();
      await handler({ method: 'GET' } as any, res);
      expect(res.status).toHaveBeenCalledWith(200);
    } finally {
      vi.unstubAllGlobals();
      process.env = saved;
    }
  });
});
