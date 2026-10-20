// IndexNow: tell Bing (and so ChatGPT search) and Yandex which URLs changed,
// right after a production deploy builds. Free. The key is a hex string Anadi
// generates once (INDEXNOW_KEY); the build writes it to dist/<key>.txt so the
// engines can verify the site owns it.

const HOST = 'anadithakur.in';

// Production = Vercel's production env, or a Cloudflare Workers Build of `main`
// (Workers Builds sets WORKERS_CI=1 and WORKERS_CI_BRANCH on every build).
const isProduction = (env) => env.VERCEL_ENV === 'production' || (env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH === 'main');

export const shouldPing = (env) => /^[a-f0-9]{8,128}$/i.test(env.INDEXNOW_KEY ?? '') && isProduction(env);

export const sitemapUrls = (xml) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());

export const indexNowPayload = (key, urls) => ({ host: HOST, key, keyLocation: `https://${HOST}/${key}.txt`, urlList: urls.slice(0, 10000) });
