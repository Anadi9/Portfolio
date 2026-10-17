/**
 * The site-wide security headers `vercel.json` sets on `/(.*)`. Kept as a small
 * module because the serverless function cannot read `vercel.json` at runtime;
 * `summary.test.ts` fails if this list drifts from the file.
 */
export const EXPECTED_HEADERS = [
  'Strict-Transport-Security',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
  'X-Frame-Options',
  'Content-Security-Policy',
] as const;

/** A CSP sent only in report-only mode is reported as such, never as an enforced header. */
export const CSP_ALIASES = ['Content-Security-Policy-Report-Only'] as const;
