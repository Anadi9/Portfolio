import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { navModule } from '../../scripts/lib/nav.mjs';
import { MEET_MENU, NAV_POSTS, RESOURCES_MENU, SERVICES_MENU, TOOLS_MENU, navDate } from './nav';

const routes = readFileSync('src/routes.tsx', 'utf8');
/** A page path the router serves: listed literally, a homepage section, or a post under a stream. */
const served = (href: string) => {
  const path = href.split(/[?#]/)[0] || '/';
  if (path === '/') return true;
  if (routes.includes(`path: '${path}'`)) return true;
  return /^\/(fixes|wisdom|dispatch|drops)(\/[a-z0-9-]+)?$/.test(path);
};

describe('nav.generated.ts', () => {
  it('matches the notes (run node scripts/generate-nav.mjs)', () => {
    expect(navModule()).toBe(readFileSync('src/data/nav.generated.ts', 'utf8'));
  });

  it('has up to three newest posts per stream, newest first', () => {
    for (const r of RESOURCES_MENU) {
      const { latest, count } = NAV_POSTS[r.key];
      expect(latest.length).toBe(Math.min(3, count));
      const dates = latest.map((p) => p.date);
      expect([...dates].sort().reverse()).toEqual(dates);
    }
  });
});

describe('header menus', () => {
  it('link only to pages the site serves', () => {
    const hrefs = [
      ...[...SERVICES_MENU.columns, ...TOOLS_MENU.columns].flatMap((c) => c.links.map((l) => l.href)),
      SERVICES_MENU.feature.cta.href,
      SERVICES_MENU.strip.link.href,
      TOOLS_MENU.feature.cta.href,
      ...MEET_MENU.map((l) => l.href),
      ...RESOURCES_MENU.flatMap((r) => [NAV_POSTS[r.key].href, ...NAV_POSTS[r.key].latest.map((p) => p.href)]),
    ];
    for (const href of hrefs) expect(served(href), href).toBe(true);
  });

  it('publishes no price but the audit', () => {
    const copy = JSON.stringify({ SERVICES_MENU, TOOLS_MENU, MEET_MENU });
    expect(copy.match(/\$\d[\d,]*/g)).toEqual(['$349']);
  });

  it('formats dates the same on the server and in the browser', () => {
    expect(navDate('2026-09-24')).toBe('24 Sep 2026');
    expect(navDate('2026-10-02')).toBe('2 Oct 2026');
  });
});
