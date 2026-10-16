import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Wraps an API handler: a thrown error becomes one structured `[api-error]`
 * log line (Vercel logs are the store) and a 500, instead of a bare crash.
 */
export function withErrorLog(
  name: string,
  handler: (req: VercelRequest, res: VercelResponse) => unknown | Promise<unknown>,
) {
  return async function wrapped(req: VercelRequest, res: VercelResponse) {
    try {
      return await handler(req, res);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      console.error('[api-error]', JSON.stringify({ name, message: e.message, stack: e.stack }));
      if (!res.headersSent) return res.status(500).json({ error: 'internal error' });
    }
  };
}
