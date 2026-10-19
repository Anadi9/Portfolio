import vercel from '../../vercel.json' with { type: 'json' };

/**
 * `vercel.json` → Cloudflare's `_headers` and `_redirects`.
 *
 * `vercel.json` stays the one place redirects and headers are written while the
 * site can run on either host. Rules conditioned on the host (`has: host`) can't
 * be said in these files; the Worker (`worker/host.ts`) and a Cloudflare Redirect
 * Rule (`docs/cloudflare-migration-guide.md`) cover them, so they are returned in
 * `skipped` rather than dropped silently.
 */

/** Vercel's path pattern → Cloudflare's: `/(.*)` and `/x/(.*)` become splats; plain paths and `:params` pass through. */
function path(source) {
  if (source === '/(.*)') return '/*';
  const splat = /^(\/[\w/-]+)\/\(\.\*\)$/.exec(source);
  if (splat) return `${splat[1]}/*`;
  if (/^[\w/.:-]+$/.test(source)) return source;
  throw new Error(`can't translate the path pattern ${source}`);
}

/** Longer (more specific) sources first, so `/rescue/audit` wins over `/rescue` whatever the order in vercel.json. */
const bySpecificity = (a, b) => b.source.split('/').length - a.source.split('/').length;

export function toCloudflareStatic(vercelJson) {
  const skipped = [];
  const redirects = [];

  for (const r of [...(vercelJson.redirects ?? [])].sort(bySpecificity)) {
    if (r.has) {
      skipped.push(r.source);
      continue;
    }
    redirects.push(`${path(r.source)} ${r.destination} ${r.permanent === false ? 302 : 301}`);
  }
  for (const r of vercelJson.rewrites ?? []) redirects.push(`${path(r.source)} ${r.destination} 200`);

  const headers = (vercelJson.headers ?? [])
    .map((h) => [path(h.source), ...h.headers.map(({ key, value }) => `  ${key}: ${value}`)].join('\n'))
    .join('\n\n');

  return { headers: `${headers}\n`, redirects: `${redirects.join('\n')}\n`, skipped };
}

/** The headers every response gets (the `/(.*)` block); the Worker adds them to what it answers itself. */
export const SECURITY_HEADERS = Object.fromEntries(vercel.headers.find((h) => h.source === '/(.*)').headers.map(({ key, value }) => [key, value]));
