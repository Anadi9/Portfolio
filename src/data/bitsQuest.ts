import type { IconName } from '@/components/brand/Bit';
import type { PricedOffer } from '@/lib/schema';
import { site } from './portfolio';
import { FAQ_ITEMS, FREE_CARDS, FREE_MORE, GUARANTEES, PRICE_GROUPS, SERVICES, type FreeCardFacts, type PriceGroupFacts } from './bitsQuestFacts';

/**
 * The homepage's content, from the Bit's Quest handoff
 * (`design/bits-quest/content/site-content.json` and `page-copy.md`).
 * Components read this; nothing on the homepage hard-codes copy.
 *
 * Where the design links to flows that don't exist yet (Bit's chat, the
 * package builder), the CTAs point at the real first-bug form or email.
 */

/** The first-bug form: the one live intake for the Fix offer. */
export const FIRST_BUG = '/audit?type=app';
const mail = (subject: string) => `mailto:${site.email}?subject=${encodeURIComponent(subject)}`;
export const QUOTE_AI = mail('AI build / MVP quote');
export const QUOTE_CARE = mail('Care plan');
export const QUOTE_CUSTOM = mail('Custom package');

export type Cta = { text: string; href: string };

/*
 * The facts (services, prices, guarantees, free tools, FAQ) live in
 * `bitsQuestFacts.ts` so Bit's AI function can read them too. This file adds
 * what only the page needs: icons and links, keyed by card title or tag.
 */
const SERVICE_LINKS: Record<string, { icon: IconName; ask: string; more: string }> = {
  'Fix · rescue & launch': { icon: 'bug-dark', ask: FIRST_BUG, more: '/production-ready' },
  'Build with AI': { icon: 'spark-dark', ask: QUOTE_AI, more: '/build-with-ai' },
  'Keep it running': { icon: 'shield-dark', ask: QUOTE_CARE, more: '/care' },
};

const GROUP_CTAS: Record<string, { cta: Cta; secondary?: Cta }> = {
  'Start here': { cta: { text: 'Find my first bug — free', href: FIRST_BUG }, secondary: { text: 'Or book the $349 audit', href: FIRST_BUG } },
  Fix: { cta: { text: 'Get my fixed quote', href: FIRST_BUG } },
  'Build with AI': { cta: { text: 'Get my fixed quote', href: QUOTE_AI } },
  'Keep it running': { cta: { text: 'Start care', href: QUOTE_CARE } },
};

const FREE_CTAS: Record<string, Cta> = {
  'Free first-bug video': { text: 'Find my first bug', href: FIRST_BUG },
  'The Wrapper Test': { text: 'Take the test →', href: '/teardown' },
  'The Production Kit': { text: 'Get the free kit', href: '/products/production-kit' },
};

export const hero = {
  title: 'Your app, made production-ready.',
  menu: [
    { label: 'Fix · something’s breaking', icon: 'bug', href: FIRST_BUG, start: 'Something’s breaking in my app' },
    { label: 'Fix · get launch-ready', icon: 'lock', href: FIRST_BUG, start: 'I’m about to launch' },
    { label: 'Build · add AI to my product', icon: 'spark', href: '/#pricing', start: 'Add AI to my product' },
    { label: 'Keep · look after my live app', icon: 'shield', href: '/#pricing', start: 'Look after my live app' },
  ] satisfies { label: string; icon: IconName; href: string; start: string }[],
  menuHint: 'Tap one to start',
  primary: { text: 'Start with Bit', href: FIRST_BUG },
  secondary: { text: 'Or: find my app’s first bug — free', href: FIRST_BUG, start: 'Find my app’s first bug — free' },
};

export type DemoBug = 'leak' | 'checkout' | 'ai' | 'consent';

export const demo = {
  eyebrow: 'Live demo · what gets fixed',
  title: 'Bugs hide in apps built fast.',
  accent: 'Bit stomps them.',
  bubble: {
    start: 'Four bugs are hiding in this app. Click one and I’ll stomp it.',
    some: 'Nice. Keep going, there are more.',
    done: 'All four fixed. Want Anadi to check yours?',
  },
  /** What each bug is, said after it's fixed. */
  fixed: {
    leak: 'Fixed: customers now see only their own orders.',
    checkout: 'Fixed: checkout completes, and failures are reported.',
    ai: 'Fixed: AI assistants can read the site and name the app.',
    consent: 'Fixed: consent is opt-in, nothing pre-ticked.',
  } satisfies Record<DemoBug, string>,
};

export const services = {
  eyebrow: 'Services',
  title: 'Fix it. Build with AI. Keep it running.',
  intro: 'Most clients start with Fix, move to Build with AI, then stay on Care. Not sure where you are? Bit picks for you.',
  cards: SERVICES.map((card) => ({ ...SERVICE_LINKS[card.tag], ...card })) satisfies { icon: IconName; tag: string; title: string; forYou: string; fixes: string[]; stats: string[][]; ask: string; more: string }[],
};

export const report = {
  eyebrow: 'Sample audit report',
  title: 'What the audit report looks like.',
  intro: 'Three areas. One clear report. Bit lines up the checks; Anadi writes yours.',
  rows: [
    { icon: 'lens-dark', area: 'AI search visibility', line: 'Mentioned in 3 of 5 test questions asked to AI assistants.', state: 'Pass', tone: 'ok' },
    { icon: 'shield-dark', area: 'Privacy compliance', line: 'Consent box is pre-ticked. No data-retention policy.', state: 'At risk', tone: 'warn' },
    { icon: 'bug-dark', area: 'Production readiness', line: '2 security headers missing. 1 endpoint open to the public.', state: 'Needs attention', tone: 'bad' },
  ] satisfies { icon: IconName; area: string; line: string; state: string; tone: 'ok' | 'warn' | 'bad' }[],
  done: '> sample ready. yours is free — anadi writes it._',
};

export const process = {
  eyebrow: 'Process · how a project runs',
  title: 'How a project runs.',
  intro: 'A typical Launch-ready sprint, from first message to live.',
  steps: [
    { day: 'Day 0', title: 'Tell Bit', body: 'Four quick taps. You get a ticket number.', price: 'Free' },
    { day: 'Day 1', title: 'First-bug video', body: 'Anadi films the biggest risk in your app.', price: 'Free' },
    { day: 'Day 2–3', title: 'Audit', body: 'Everything checked, ranked Fix now / Risky / Can wait.', price: '$349' },
    { day: 'Day 4–10', title: 'The fix', body: 'Fixed quote, agreed first. A written update every day.', price: 'Fixed quote' },
    { day: 'Day 11', title: 'Live', body: 'It ships, and you confirm it works.', price: 'Live' },
    { day: 'Day 12+', title: 'Care', body: 'Optional. Bit stays on guard every month.', price: 'Optional' },
  ],
  log: [
    ['Day 00', 'Ticket #A-0000 opened for example-app.com. Anadi notified.'],
    ['Day 01', 'First-bug video sent: “Anyone can see other people’s orders.” Fixed quote attached.'],
    ['Day 02', 'Audit started: everything checked and ranked.'],
    ['Day 04', 'Fix booked: Launch-ready sprint. Daily updates begin.'],
    ['Day 07', 'Update posted: access rules fixed and tested. Checkout next.'],
    ['Day 11', 'Live. Client confirmed it works.'],
    ['Day 12', 'Care started: monitoring on, first monthly review booked.'],
  ],
};

export const checks = {
  eyebrow: 'Audit checklist',
  title: 'What the audit covers.',
  intro: 'Three areas that affect revenue, risk and customer trust — for any web or mobile product. You get a plain-English report, ranked by business impact.',
  areas: [
    {
      area: 'Reliability & security',
      note: 'Protects revenue and customer trust.',
      more: { text: 'Production readiness', href: '/production-ready' },
      items: [
        ['Customer accounts & access', 'Sign-in, roles and permissions work exactly as intended.'],
        ['Customer data protection', 'Each customer can only ever see their own records.'],
        ['Passwords & credentials', 'No keys or secrets exposed in code or the browser.'],
        ['Uptime & safe releases', 'Updates ship without downtime and can be rolled back.'],
        ['Performance & error alerts', 'Slow pages and failures are caught before customers notice.'],
      ],
    },
    {
      area: 'Search & AI visibility',
      note: 'Helps new customers find and choose you.',
      more: { text: 'Search & AI visibility', href: '/ai-visibility' },
      items: [
        ['Search & AI access', 'Google and AI assistants can read your key pages.'],
        ['Business information', 'Services, pricing and contact details are clear to search engines.'],
        ['Consistent brand details', 'Your name, offer and locations match everywhere online.'],
        ['Answer-ready content', 'Pages answer the questions your buyers actually ask.'],
        ['Help & product docs', 'Public, current and easy for AI tools to reference.'],
        ['Reviews & mentions', 'Trusted third-party sites reference your business.'],
      ],
    },
    {
      area: 'Privacy & compliance',
      note: 'Aligned with GDPR, CCPA and India’s DPDP Act.',
      more: { text: 'Privacy & compliance', href: '/dpdp' },
      items: [
        ['Clear consent', 'Customers opt in knowingly — nothing pre-ticked.'],
        ['Privacy notices', 'Plain-language policies that match what the app really does.'],
        ['Data map', 'What personal data you hold, where it lives, who can access it.'],
        ['Customer data requests', 'Access, export and deletion handled on time.'],
        ['Third-party vendors', 'Every tool that receives customer data is listed and covered.'],
        ['Incident readiness', 'A clear plan if data is ever exposed.'],
      ],
    },
  ],
};

export const pricing = {
  eyebrow: 'Pricing',
  title: 'Simple, fixed quotes.',
  intro: 'Every project starts with a free first-bug review. The audit is $349; everything after it gets one fixed quote for your project.',
  guarantees: GUARANTEES,
  groups: PRICE_GROUPS.map((group) => ({ ...group, ...GROUP_CTAS[group.title] })) as (PriceGroupFacts & { cta: Cta; secondary?: Cta })[],
  footnote: 'Not sure which one you need? Start with the free first-bug review — Anadi will tell you.',
  custom: {
    title: 'Need a mix? Build your own package.',
    body: 'Tell Anadi what you need. You get one fixed quote for all of it.',
    cta: { text: 'Ask for a custom package', href: QUOTE_CUSTOM },
  },
};

/**
 * Structured-data offers for the homepage's `Service` nodes. Only the audit has
 * a published price; the other packages are quoted per project, so they carry
 * no offer rather than a range search engines would repeat.
 */
export const offers: Record<'fix' | 'build' | 'care', PricedOffer[]> = {
  fix: [{ name: 'Production audit', description: 'Reliability, search visibility and privacy, ranked by business impact.', min: 349, currency: 'USD' }],
  build: [],
  care: [],
};

export const board = {
  eyebrow: 'Request tracking',
  title: 'Every request, tracked.',
  intro: 'Once your request is saved, you get a ticket number and can follow it in your client portal.',
  ticket: {
    id: 'Ticket #A-0000',
    stack: 'CRM · Next.js',
    steps: [
      ['Request received', 'Mon', 'done'],
      ['First-bug video', 'Tue · sent ✓', 'done'],
      ['Audit', 'Wed–Thu · report ✓', 'done'],
      ['Fix booked', 'Fri · Launch-ready sprint', 'done'],
      ['Fixing', 'Day 4 of 7 · update posted today', 'now'],
      ['Live', 'You confirm it works', 'next'],
      ['Care', 'Optional', 'next'],
    ] as [string, string, 'done' | 'now' | 'next'][],
  },
  loopTitle: 'How you’re kept in the loop',
  loop: [
    ['A ticket number', 'when Bit or the form saves your request — no account needed.'],
    ['Your first-bug video', 'within 24 hours, with a fixed quote to fix it.'],
    ['A written update every day', 'while work is in progress. No chasing.'],
    ['You confirm it’s live', 'before the work is marked done.'],
  ],
  cta: { text: 'Start my request', href: FIRST_BUG },
};

export const free = {
  title: 'Start free.',
  tag: 'Free tools · no card, no call',
  cards: FREE_CARDS.map((card) => ({ ...card, cta: FREE_CTAS[card.title] })) as (FreeCardFacts & { cta: Cta })[],
  more: FREE_MORE,
};

export type BlogTopic = 'Production' | 'AI visibility' | 'Privacy';

/** Real posts from /notes, picked for the three audit areas. */
export const blog = {
  eyebrow: 'Blog · field notes',
  title: 'The blog.',
  intro: 'What breaks in apps built fast, and how it gets fixed. Written by Anadi.',
  topics: ['Production', 'AI visibility', 'Privacy'] as BlogTopic[],
  posts: [
    { topic: 'Production', date: '24 Sep 2026', href: '/fixes/lovable-supabase-rls', title: 'Your Lovable app’s Supabase tables are readable by anyone', dek: 'How row-level security gets skipped when apps are built fast — and how to check yours.' },
    { topic: 'AI visibility', date: '24 Sep 2026', href: '/fixes/lovable-app-invisible-to-google-and-chatgpt', title: 'Why Google and ChatGPT can’t see your Lovable app', dek: 'AI crawlers often get an empty page. What they actually read, and how to fix it.' },
    { topic: 'Privacy', date: '13 Oct 2026', href: '/wisdom/dpdp-act-checklist-for-apps', title: 'DPDP Act checklist for apps: what to build before May 2027', dek: 'Notice, consent, deletion and breach alerts — in product terms, not legal ones.' },
    { topic: 'Production', date: '24 Sep 2026', href: '/wisdom/ai-built-app-production-checklist', title: 'Before real users touch your AI-built app: the production checklist', dek: 'Security, auth, deploys, data and errors — what gets checked before launch day.' },
    { topic: 'AI visibility', date: '13 Oct 2026', href: '/wisdom/get-recommended-by-chatgpt', title: 'How to get your business recommended by ChatGPT', dek: 'Be readable, be specific, be mentioned. The three things that decide it.' },
    { topic: 'Privacy', date: '13 Oct 2026', href: '/wisdom/dpdp-vs-gdpr-for-developers', title: 'DPDP vs GDPR for developers', dek: 'What carries over from GDPR, and what you still have to build for India.' },
    { topic: 'Production', date: '24 Sep 2026', href: '/fixes/works-locally-breaks-on-vercel', title: 'Works locally, breaks on Vercel', dek: 'The five reasons a Lovable or Cursor app fails in production.' },
    { topic: 'AI visibility', date: '13 Oct 2026', href: '/wisdom/geo-vs-seo-vs-aeo', title: 'GEO vs AEO vs SEO: which one your business needs', dek: 'Ranked links, quoted answers and AI recommendations — what each one means.' },
  ] as { topic: BlogTopic; date: string; href: string; title: string; dek: string }[],
  all: { text: 'All posts', href: '/notes' },
};

export const about = {
  eyebrow: 'Who you’ll work with',
  title: 'Meet Anadi.',
  intro: 'Bit takes your question. Anadi reads it and does the work.',
  name: 'Anadi Thakur',
  role: 'Full-stack engineer',
  bio: 'I’m a senior full-stack engineer. I fix and harden React, Node and Postgres products — whether people or AI wrote them — and add AI features that hold up in production. I work in React, Next.js, React Native and Node, and I fix what’s broken instead of rebuilding from scratch.',
  stats: [
    ['XP', `${Number(site.years)}+ years shipping`],
    ['Releases', `${site.releases} in production`],
    ['Base', 'India · remote'],
    ['Online', '8am–12pm EST'],
  ],
  worked:
    'the ZEISS Microscopy product platform, and built Signal, an AI lead-scoring app. Clients include ZEISS, Zenqua, Precious, Yugam, Shethink and Orions.',
  links: [
    { text: 'Portfolio ↗', href: 'https://portfolio.anadithakur.in/' },
    { text: 'GitHub ↗', href: site.github },
    { text: 'LinkedIn ↗', href: site.linkedin },
  ],
};

export const faq = {
  eyebrow: 'FAQ',
  title: 'Questions, answered.',
  items: FAQ_ITEMS,
};
