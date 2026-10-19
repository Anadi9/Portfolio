/// <reference types="@cloudflare/workers-types" />

/** Bindings from `wrangler.jsonc`. Secrets reach the code through `process.env` (`nodejs_compat`). */
interface Env {
  ASSETS: Fetcher;
  SITE_ENV: 'production' | 'preview';
}
