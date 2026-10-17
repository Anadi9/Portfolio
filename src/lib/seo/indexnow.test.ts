import { describe, expect, it } from 'vitest';
import { indexNowPayload, sitemapUrls, shouldPing } from '../../../scripts/lib/indexnow.mjs';

describe('IndexNow', () => {
  it('pings only on production builds with a valid key', () => {
    expect(shouldPing({ INDEXNOW_KEY: 'a1b2c3d4e5f6a7b8', VERCEL_ENV: 'production' })).toBe(true);
    expect(shouldPing({ INDEXNOW_KEY: 'a1b2c3d4e5f6a7b8', VERCEL_ENV: 'preview' })).toBe(false);
    expect(shouldPing({ VERCEL_ENV: 'production' })).toBe(false);
    expect(shouldPing({ INDEXNOW_KEY: 'not hex!', VERCEL_ENV: 'production' })).toBe(false);
    expect(shouldPing({ INDEXNOW_KEY: 'abc', VERCEL_ENV: 'production' })).toBe(false);
  });

  it('reads the sitemap and builds the payload', () => {
    const urls = sitemapUrls('<urlset><url><loc>https://anadithakur.in/</loc></url><url><loc>https://anadithakur.in/notes</loc></url></urlset>');
    expect(urls).toEqual(['https://anadithakur.in/', 'https://anadithakur.in/notes']);
    expect(indexNowPayload('a1b2c3d4e5f6a7b8', urls)).toEqual({
      host: 'anadithakur.in',
      key: 'a1b2c3d4e5f6a7b8',
      keyLocation: 'https://anadithakur.in/a1b2c3d4e5f6a7b8.txt',
      urlList: urls,
    });
  });
});
