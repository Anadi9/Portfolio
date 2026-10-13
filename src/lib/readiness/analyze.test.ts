import { describe, expect, it } from 'vitest';
import { analyze, isAllowed, jsonLdTypes, parseRobots, readPage, type Gathered } from './analyze';

describe('robots.txt', () => {
  it('lets a named group override the wildcard', () => {
    const r = parseRobots('User-agent: *\nDisallow: /\n\nUser-agent: OAI-SearchBot\nAllow: /\n');
    expect(isAllowed(r, 'OAI-SearchBot')).toBe(true);
    expect(isAllowed(r, 'GPTBot')).toBe(false);
  });

  it('treats an empty Disallow and a missing file as allowed', () => {
    expect(isAllowed(parseRobots('User-agent: *\nDisallow:\n'), 'ClaudeBot')).toBe(true);
    expect(isAllowed(parseRobots(''), 'ClaudeBot')).toBe(true);
  });

  it('shares rules across consecutive user-agent lines, case-insensitively', () => {
    const r = parseRobots('User-agent: GPTBot\nUser-agent: claudebot\nDisallow: /\n');
    expect(isAllowed(r, 'GPTBot')).toBe(false);
    expect(isAllowed(r, 'ClaudeBot')).toBe(false);
    expect(isAllowed(r, 'PerplexityBot')).toBe(true);
  });

  it('picks the longest matching rule, Allow winning a tie, with wildcards', () => {
    const r = parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/ok\nDisallow: /*.pdf$\n');
    expect(isAllowed(r, 'x', '/private/a')).toBe(false);
    expect(isAllowed(r, 'x', '/private/ok/1')).toBe(true);
    expect(isAllowed(r, 'x', '/file.pdf')).toBe(false);
    expect(isAllowed(r, 'x', '/file.pdf?x')).toBe(true);
    expect(isAllowed(r, 'x', '/')).toBe(true);
  });

  it('collects sitemap lines and ignores comments', () => {
    expect(parseRobots('# hi\nSitemap: https://a.com/s.xml # trailing\n').sitemaps).toEqual(['https://a.com/s.xml']);
  });
});

describe('page facts', () => {
  it('flattens JSON-LD through @graph and skips broken blocks', () => {
    const html = `<script type="application/ld+json">{"@context":"x","@graph":[{"@type":"Organization"},{"@type":["Product","Thing"]}]}</script>
      <script type="application/ld+json">{broken</script>`;
    expect(jsonLdTypes(html).sort()).toEqual(['Organization', 'Product', 'Thing']);
  });

  it('reads title, description, canonical, h1s and noindex, and counts only visible words', () => {
    const f = readPage(`<html><head><title> Leaf &amp; Co </title><meta name="description" content="Skincare">
      <link rel="canonical" href="https://leaf.co/"><meta name="robots" content="noindex, follow"></head>
      <body><h1>Hi</h1><script>var lots = "of words here that do not count"</script><p>one two three</p></body></html>`);
    expect(f).toMatchObject({ title: 'Leaf & Co', description: 'Skincare', canonical: 'https://leaf.co/', h1: 1, noindex: true, words: 4 });
  });
});

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ');
const good: Gathered = {
  finalUrl: 'https://leaf.co/',
  status: 200,
  html: `<html><head><title>Leaf</title><meta name="description" content="Organic skincare">
    <link rel="canonical" href="https://leaf.co/"><meta property="og:image" content="/og.png">
    <script type="application/ld+json">{"@type":"Organization"}</script></head><body><h1>Leaf</h1><p>${words(200)}</p></body></html>`,
  robots: 'User-agent: *\nAllow: /\nSitemap: https://leaf.co/sitemap.xml',
  llms: '# Leaf',
  sitemapFound: true,
};

describe('analyze', () => {
  it('scores a well-built site 100 with nothing to fix', () => {
    const r = analyze(good);
    expect(r.score).toBe(100);
    expect(r.topFixes).toEqual([]);
    expect(r.bots.every((b) => b.allowed)).toBe(true);
  });

  it('puts an empty client-rendered shell first among the fixes', () => {
    const r = analyze({ ...good, html: '<html><head><title>App</title></head><body><div id="root"></div></body></html>' });
    expect(r.topFixes[0].id).toBe('content');
    expect(r.score).toBeLessThan(60);
  });

  it('fails crawler access when AI search bots are blocked, but only warns for training bots', () => {
    const search = analyze({ ...good, robots: 'User-agent: OAI-SearchBot\nDisallow: /\n' });
    expect(search.findings.find((f) => f.id === 'bots')?.status).toBe('fail');
    const training = analyze({ ...good, robots: 'User-agent: GPTBot\nDisallow: /\nUser-agent: Google-Extended\nDisallow: /\n' });
    expect(training.findings.find((f) => f.id === 'bots')?.status).toBe('warn');
  });

  it('flags noindex', () => {
    const r = analyze({ ...good, html: good.html.replace('<title>', '<meta name="robots" content="noindex"><title>') });
    expect(r.findings.find((f) => f.id === 'noindex')?.status).toBe('fail');
  });

  it('returns at most three fixes, failures before warnings', () => {
    const r = analyze({ finalUrl: 'https://x.co/', status: 200, html: '<html></html>', robots: null, llms: null, sitemapFound: false });
    expect(r.topFixes).toHaveLength(3);
    expect(r.topFixes.every((f) => f.status === 'fail')).toBe(true);
  });
});
