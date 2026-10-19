/// <reference types="@cloudflare/workers-types" />

/** Bindings from `wrangler.jsonc`. Secrets reach the code through `process.env` (`nodejs_compat`). */
interface Env {
  ASSETS: Fetcher;
  SITE_ENV: 'production' | 'preview';
}

/** `rules: Data` in wrangler.jsonc: a `.zip` import is its bytes. */
declare module '*.zip' {
  const data: ArrayBuffer;
  export default data;
}
