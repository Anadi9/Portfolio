import { z } from 'zod';

/**
 * Shape of a browser error report. No PII fields: no user agent, IP, cookies,
 * query string or form values. `path` is a pathname only.
 */
const schema = z.object({
  message: z.string().min(1).max(500),
  source: z.string().max(300).optional(),
  line: z.number().int().min(0).max(1_000_000).optional(),
  col: z.number().int().min(0).max(1_000_000).optional(),
  stack: z.string().max(2000).optional(),
  path: z.string().min(1).max(200),
});

export type ClientError = z.infer<typeof schema>;

export function parseClientError(
  body: unknown,
): { ok: true; report: ClientError } | { ok: false; error: string } {
  const r = schema.strict().safeParse(body);
  if (!r.success) return { ok: false, error: 'invalid report' };
  return { ok: true, report: r.data };
}
