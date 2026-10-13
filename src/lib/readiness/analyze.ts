/**
 * The AI Readiness Checker's judgement: given what a site serves (its homepage
 * HTML, robots.txt, llms.txt and whether a sitemap answers), what can AI
 * crawlers actually read, and what should be fixed first.
 *
 * Pure and dependency-free: the browser renders results from it, the function
 * in `api/ai-readiness.ts` computes them with it, and the tests run it on
 * strings. All fetching lives in `check.ts`, which is server-only.
 *
 * The checks are deliberately the ones a crawler that does not run JavaScript
 * can see, because that is how most AI crawlers behave: an app whose content
 * only appears after hydration is, to them, the empty shell this reads.
 */

/** The crawlers that matter for AI answers, in the order the report lists them. */
export const AI_BOTS = [
  { ua: 'OAI-SearchBot', who: 'ChatGPT search' },
  { ua: 'ChatGPT-User', who: 'ChatGPT browsing' },
  { ua: 'GPTBot', who: 'OpenAI training' },
  { ua: 'ClaudeBot', who: 'Claude' },
  { ua: 'PerplexityBot', who: 'Perplexity' },
  { ua: 'Google-Extended', who: 'Gemini' },
  { ua: 'Bingbot', who: 'Bing and Copilot' },
  { ua: 'Googlebot', who: 'Google Search and AI Overviews' },
] as const;

type Rule = { allow: boolean; path: string };
type Group = { agents: string[]; rules: Rule[] };

/** robots.txt into groups. Comments and unknown lines are skipped; consecutive user-agent lines share a group. */
export function parseRobots(text: string): { groups: Group[]; sitemaps: string[] } {
  const groups: Group[] = [];
  const sitemaps: string[] = [];
  let current: Group | null = null;
  let lastWasAgent = false;

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    if (!line) continue;
    const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(line);
    if (!m) continue;
    const field = m[1].toLowerCase();
    const value = m[2].trim();

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (field === 'sitemap') {
      if (value) sitemaps.push(value);
    } else if ((field === 'allow' || field === 'disallow') && current) {
      // An empty Disallow means "allow everything" and contributes no rule.
      if (value) current.rules.push({ allow: field === 'allow', path: value });
    }
  }
  return { groups, sitemaps };
}

/** RFC 9309 path matching: `*` wildcards, `$` end anchor. */
const matches = (pattern: string, path: string) => {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`).test(path);
};

/**
 * Whether `ua` may fetch `path`, per RFC 9309: the most specific group naming
 * the agent wins (falling back to `*`), then the longest matching rule, with
 * Allow winning a tie. No group and no rule means allowed.
 */
export function isAllowed(robots: ReturnType<typeof parseRobots>, ua: string, path = '/'): boolean {
  const name = ua.toLowerCase();
  const named = robots.groups.filter((g) => g.agents.includes(name));
  const groups = named.length ? named : robots.groups.filter((g) => g.agents.includes('*'));
  const rules = groups.flatMap((g) => g.rules).filter((r) => matches(r.path, path));
  if (!rules.length) return true;
  rules.sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
  return rules[0].allow;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');

const attr = (tag: string, name: string) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? decode(m[2] ?? m[3] ?? m[4] ?? '') : null;
};

const metaContent = (html: string, key: 'name' | 'property', value: string) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if ((attr(tag, key) ?? '').toLowerCase() === value) return attr(tag, 'content');
  }
  return null;
};

/** Every `@type` in the page's JSON-LD, flattened through `@graph` and arrays. Malformed blocks are skipped. */
export function jsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const t = (node as Record<string, unknown>)['@type'];
    if (typeof t === 'string') types.add(t);
    if (Array.isArray(t)) t.filter((x) => typeof x === 'string').forEach((x) => types.add(x as string));
    Object.values(node as Record<string, unknown>).forEach((v) => typeof v === 'object' && walk(v));
  };
  for (const m of html.matchAll(/<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      walk(JSON.parse(m[1]));
    } catch {
      /* a broken block is reported as missing, which is what a crawler sees */
    }
  }
  return [...types];
}

/** The text a non-JS crawler gets: scripts, styles, templates and tags removed. */
export function visibleText(html: string): string {
  const body = /<body\b[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return decode(
    body
      .replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

export type PageFacts = {
  title: string | null;
  description: string | null;
  canonical: string | null;
  h1: number;
  words: number;
  noindex: boolean;
  ogImage: boolean;
  jsonLd: string[];
};

export function readPage(html: string): PageFacts {
  const title = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  let canonical: string | null = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if ((attr(tag, 'rel') ?? '').toLowerCase() === 'canonical') canonical = attr(tag, 'href');
  }
  const robots = (metaContent(html, 'name', 'robots') ?? '').toLowerCase();
  return {
    title: title ? decode(title).replace(/\s+/g, ' ').trim() || null : null,
    description: metaContent(html, 'name', 'description')?.trim() || null,
    canonical,
    h1: (html.match(/<h1\b/gi) ?? []).length,
    words: visibleText(html).split(' ').filter(Boolean).length,
    noindex: robots.includes('noindex'),
    ogImage: !!metaContent(html, 'property', 'og:image'),
    jsonLd: jsonLdTypes(html),
  };
}

/** What `check.ts` gathered. `null` means the fetch failed or returned non-2xx. */
export type Gathered = {
  finalUrl: string;
  status: number;
  html: string;
  robots: string | null;
  llms: string | null;
  sitemapFound: boolean;
};

export type Status = 'pass' | 'warn' | 'fail';

export type Finding = {
  id: string;
  label: string;
  status: Status;
  detail: string;
  /** What to do about it; only on warn and fail. */
  fix?: string;
  /** How much this costs AI visibility when it fails. Drives the score and the fix order. */
  weight: number;
};

export type BotAccess = { ua: string; who: string; allowed: boolean };

export type Report = {
  url: string;
  score: number;
  findings: Finding[];
  bots: BotAccess[];
  /** The three highest-weight non-passing findings. */
  topFixes: Finding[];
};

/** Below this, the HTML a crawler receives is effectively an empty app shell. */
export const THIN_WORDS = 80;

const USEFUL_TYPES = ['Organization', 'LocalBusiness', 'ProfessionalService', 'Store', 'Product', 'Service', 'Person', 'WebSite', 'FAQPage', 'Article', 'BlogPosting'];

export function analyze(g: Gathered): Report {
  const page = readPage(g.html);
  const robots = parseRobots(g.robots ?? '');
  const bots: BotAccess[] = AI_BOTS.map((b) => ({ ...b, allowed: isAllowed(robots, b.ua, '/') }));
  const blocked = bots.filter((b) => !b.allowed);
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);

  add(
    page.words >= THIN_WORDS
      ? { id: 'content', label: 'Content in the HTML', status: 'pass', weight: 30, detail: `Crawlers that don’t run JavaScript get about ${page.words} words of real content.` }
      : {
          id: 'content',
          label: 'Content in the HTML',
          status: 'fail',
          weight: 30,
          detail: `Crawlers that don’t run JavaScript get ${page.words} words: an almost empty page. Most AI crawlers are in that group.`,
          fix: 'Prerender or server-render your pages so the content is in the HTML itself, not added by JavaScript after load.',
        },
  );

  const searchBlocked = blocked.filter((b) => ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Bingbot', 'Googlebot', 'ClaudeBot'].includes(b.ua));
  add(
    blocked.length === 0
      ? { id: 'bots', label: 'AI crawlers allowed', status: 'pass', weight: 25, detail: 'robots.txt lets every major AI crawler read your homepage.' }
      : {
          id: 'bots',
          label: 'AI crawlers allowed',
          status: searchBlocked.length ? 'fail' : 'warn',
          weight: 25,
          detail: `robots.txt blocks ${blocked.map((b) => `${b.ua} (${b.who})`).join(', ')}.`,
          fix: searchBlocked.length
            ? 'Allow the AI search crawlers in robots.txt. Blocking them keeps you out of ChatGPT, Perplexity and Copilot answers.'
            : 'Only training crawlers are blocked, which is a fair choice. Make sure it’s a deliberate one.',
        },
  );

  if (page.noindex) {
    add({ id: 'noindex', label: 'Indexable', status: 'fail', weight: 25, detail: 'The homepage asks search engines not to index it (meta robots noindex).', fix: 'Remove the noindex tag from pages you want found.' });
  }

  const useful = page.jsonLd.filter((t) => USEFUL_TYPES.includes(t));
  add(
    useful.length
      ? { id: 'schema', label: 'Structured data', status: 'pass', weight: 15, detail: `Found ${useful.join(', ')}.` }
      : {
          id: 'schema',
          label: 'Structured data',
          status: 'fail',
          weight: 15,
          detail: page.jsonLd.length ? `Only ${page.jsonLd.join(', ')}: nothing that says who you are or what you sell.` : 'No JSON-LD structured data on the homepage.',
          fix: 'Add Organization (or LocalBusiness) and Product or Service structured data, so AI can state who you are and what you sell.',
        },
  );

  add(
    page.title && page.description
      ? { id: 'meta', label: 'Title and description', status: 'pass', weight: 10, detail: `“${page.title}”` }
      : {
          id: 'meta',
          label: 'Title and description',
          status: page.title || page.description ? 'warn' : 'fail',
          weight: 10,
          detail: `${page.title ? 'Has a title' : 'No title'}, ${page.description ? 'has a description' : 'no meta description'}.`,
          fix: 'Give every page a specific title and a one-sentence meta description that says what you do and for whom.',
        },
  );

  add(
    page.h1 === 1
      ? { id: 'h1', label: 'One clear heading', status: 'pass', weight: 5, detail: 'The page has exactly one H1.' }
      : {
          id: 'h1',
          label: 'One clear heading',
          status: 'warn',
          weight: 5,
          detail: page.h1 === 0 ? 'No H1 in the HTML.' : `${page.h1} H1 headings in the HTML.`,
          fix: 'Use one H1 per page that names what the page is about.',
        },
  );

  add(
    g.sitemapFound || robots.sitemaps.length
      ? { id: 'sitemap', label: 'Sitemap', status: 'pass', weight: 5, detail: 'A sitemap is declared or answers at /sitemap.xml.' }
      : { id: 'sitemap', label: 'Sitemap', status: 'warn', weight: 5, detail: 'No sitemap found.', fix: 'Publish /sitemap.xml and declare it in robots.txt.' },
  );

  add(
    g.llms
      ? { id: 'llms', label: 'llms.txt', status: 'pass', weight: 3, detail: 'Serves an llms.txt summary for AI tools.' }
      : {
          id: 'llms',
          label: 'llms.txt',
          status: 'warn',
          weight: 3,
          detail: 'No /llms.txt.',
          fix: 'Optional, but cheap: add an llms.txt that summarises what you offer, with links to your key pages.',
        },
  );

  add(
    page.canonical
      ? { id: 'canonical', label: 'Canonical URL', status: 'pass', weight: 2, detail: page.canonical }
      : { id: 'canonical', label: 'Canonical URL', status: 'warn', weight: 2, detail: 'No canonical link.', fix: 'Add a canonical link so duplicate URLs don’t split your signals.' },
  );

  add(
    page.ogImage
      ? { id: 'og', label: 'Share preview', status: 'pass', weight: 2, detail: 'Has an og:image for link previews.' }
      : { id: 'og', label: 'Share preview', status: 'warn', weight: 2, detail: 'No og:image.', fix: 'Add Open Graph tags so links to you preview properly in chats and AI tools.' },
  );

  const total = findings.reduce((n, f) => n + f.weight, 0);
  const earned = findings.reduce((n, f) => n + (f.status === 'pass' ? f.weight : f.status === 'warn' ? f.weight / 2 : 0), 0);
  const topFixes = findings
    .filter((f) => f.status !== 'pass')
    .sort((a, b) => (a.status === b.status ? b.weight - a.weight : a.status === 'fail' ? -1 : 1))
    .slice(0, 3);

  return { url: g.finalUrl, score: Math.round((earned / total) * 100), findings, bots, topFixes };
}
