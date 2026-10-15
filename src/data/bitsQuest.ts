import type { IconName } from '@/components/brand/Bit';
import type { PricedOffer } from '@/lib/schema';
import { site } from './portfolio';

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

export const hero = {
  title: 'Your app, made production-ready.',
  menu: [
    { label: 'Fix · something’s breaking', icon: 'bug', href: FIRST_BUG },
    { label: 'Fix · get launch-ready', icon: 'lock', href: FIRST_BUG },
    { label: 'Build · add AI to my product', icon: 'spark', href: '/#pricing' },
    { label: 'Keep · look after my live app', icon: 'shield', href: '/#pricing' },
  ] satisfies { label: string; icon: IconName; href: string }[],
  menuHint: 'Tap one to start',
  primary: { text: 'Start with Bit', href: FIRST_BUG },
  secondary: { text: 'Or: find my app’s first bug — free', href: FIRST_BUG },
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
  cards: [
    {
      icon: 'bug-dark',
      tag: 'Fix · rescue & launch',
      title: 'Fix it — or get it launch-ready',
      forYou: 'Something’s breaking — login, data, payments, deploys, speed — or you’re about to launch and need it to hold up.',
      fixes: ['Login, accounts and permissions', 'Data security and access rules', 'Payments, deploys and error tracking', 'Speed, crashes and stability'],
      stats: [['Audit', '$349'], ['Fix', '$1,500–$6,000'], ['Time', 'From 1 week']],
      ask: FIRST_BUG,
    },
    {
      icon: 'spark-dark',
      tag: 'Build with AI',
      title: 'Add AI that actually works',
      forYou: 'You want AI in your product or workflow — without runaway costs, wrong answers or a demo that breaks in real use.',
      fixes: ['Assistants that answer from your data', 'Smart search and document reading', 'Agents and workflow automations', 'Guardrails, fallbacks and cost limits'],
      stats: [['AI build', '$2,000–$8,000'], ['MVP', '$6,000–$20,000'], ['Quote', 'Fixed']],
      ask: QUOTE_AI,
    },
    {
      icon: 'shield-dark',
      tag: 'Keep it running',
      title: 'Keep it fast, safe and found',
      forYou: 'Your product is live and you want a senior engineer watching it — and buyers and AI search finding it.',
      fixes: ['Monitoring and a monthly health review', 'Small fixes and upgrades every month', 'Quarterly search-visibility re-check', 'Quarterly privacy check (GDPR · CCPA · DPDP)'],
      stats: [['Care', '$299/mo'], ['Term', 'Monthly'], ['Cancel', 'Anytime']],
      ask: QUOTE_CARE,
    },
  ] satisfies { icon: IconName; tag: string; title: string; forYou: string; fixes: string[]; stats: string[][]; ask: string }[],
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
    { day: 'Day 0', title: 'Tell Bit', body: 'Four quick taps. You get a ticket number.', price: '$0' },
    { day: 'Day 1', title: 'First-bug video', body: 'Anadi films the biggest risk in your app.', price: '$0 · free' },
    { day: 'Day 2–3', title: 'Audit', body: 'Everything checked, ranked Fix now / Risky / Can wait.', price: '$349 · credited' },
    { day: 'Day 4–10', title: 'The fix', body: 'Fixed price. A written update every day.', price: '50% to start' },
    { day: 'Day 11', title: 'Live', body: 'You confirm it works. Then the rest is due.', price: '50% when live' },
    { day: 'Day 12+', title: 'Care', body: 'Optional. Bit stays on guard every month.', price: '$299/mo · optional' },
  ],
  log: [
    ['Day 00', 'Ticket #A-1047 opened for example-app.com. Anadi notified.'],
    ['Day 01', 'First-bug video sent: “Anyone can see other people’s orders.” Fixed price attached.'],
    ['Day 02', 'Audit started — $349, credited toward the fix.'],
    ['Day 04', 'Fix booked: Launch-ready sprint. Daily updates begin.'],
    ['Day 11', 'Live. Client confirmed it works. Second half invoiced.'],
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
  title: 'Simple, fixed pricing.',
  intro: 'Six fixed-price packages. Every project starts with a free first-bug review, and the audit is credited in full.',
  guarantees: [
    ['First bug free', 'A real issue in your app, on video, in 24h.'],
    ['Audit credited 100%', 'Every dollar counts toward the fix.'],
    ['Nothing found? Full refund', 'No real issues means you pay nothing.'],
    ['Pay the rest when it’s live', 'Half to start, half once it works.'],
  ],
  groups: [
    {
      label: 'Step 1 · diagnose',
      title: 'Start here',
      blurb: 'Not sure what’s wrong? Get a clear, ranked diagnosis first.',
      style: 'dark',
      packages: [
        { name: 'Production audit', duration: '48 hours', price: '$349', detail: 'Reliability, search visibility and privacy — one plain-English report, ranked by business impact.' },
      ],
      includes: ['Your biggest risk found free, on video, in 24h', 'Credited 100% toward any package', 'Nothing found? Full refund'],
      cta: { text: 'Find my first bug — free', href: FIRST_BUG },
      secondary: { text: 'Or book the $349 audit', href: FIRST_BUG },
    },
    {
      label: 'Step 2 · fix',
      title: 'Fix',
      blurb: 'Make a broken or risky app stable, secure and launch-ready.',
      style: 'highlight',
      packages: [
        { name: 'Launch-ready sprint', duration: '1 week', price: '$1,500–$2,500', detail: 'Up to three problem areas fixed, tested and shipped.', badge: '★ Most popular' },
        { name: 'Full rescue', duration: '2–3 weeks', price: '$3,000–$6,000', detail: 'Everything the audit found, plus tests and monitoring.' },
      ],
      includes: ['One fixed price — no hourly billing', 'Daily written updates', 'Pay the second half when it’s live'],
      cta: { text: 'Get my exact price', href: FIRST_BUG },
    },
    {
      label: 'Build',
      title: 'Build with AI',
      blurb: 'Add AI to your product, or build a new one from zero.',
      style: 'plain',
      packages: [
        { name: 'AI build', duration: '1–4 weeks', price: '$2,000–$8,000', detail: 'An assistant, smart search or automation — with guardrails and cost limits.' },
        { name: 'MVP build', duration: '4–8 weeks', price: '$6,000–$20,000', detail: 'A complete web or mobile product, ready for real users.' },
      ],
      includes: ['Fixed quote after a short scoping call', 'Weekly demos as it’s built', 'Pay in milestones'],
      cta: { text: 'Get my exact price', href: QUOTE_AI },
    },
    {
      label: 'Ongoing',
      title: 'Keep it running',
      blurb: 'A senior engineer looking after your live product.',
      style: 'plain',
      packages: [
        { name: 'Care plan', duration: 'Monthly', price: '$299/mo', detail: 'Monitoring, a monthly health review and small fixes included.' },
      ],
      includes: ['Quarterly visibility and privacy re-check', 'Priority response when something breaks', 'Cancel anytime'],
      cta: { text: 'Start care', href: QUOTE_CARE },
    },
  ] as {
    label: string;
    title: string;
    blurb: string;
    style: 'dark' | 'highlight' | 'plain';
    packages: { name: string; duration: string; price: string; detail: string; badge?: string }[];
    includes: string[];
    cta: Cta;
    secondary?: Cta;
  }[],
  footnote: 'Six packages, all fixed-price. Not sure which one? Start with the free first-bug review — Anadi will tell you.',
  custom: {
    title: 'Need a mix? Build your own package.',
    body: 'Tell Anadi what you need. You get one fixed total, with the audit credited.',
    cta: { text: 'Ask for a custom package', href: QUOTE_CUSTOM },
  },
};

/** Structured-data offers for the homepage's `Service` nodes, from the same prices. */
export const offers: Record<'fix' | 'build' | 'care', PricedOffer[]> = {
  fix: [
    { name: 'Production audit', description: 'Reliability, search visibility and privacy, ranked by impact. Credited in full.', min: 349, currency: 'USD' },
    { name: 'Launch-ready sprint', description: 'Up to three problem areas fixed, tested and shipped in a week.', min: 1500, max: 2500, currency: 'USD' },
    { name: 'Full rescue', description: 'Everything the audit found, plus tests and monitoring.', min: 3000, max: 6000, currency: 'USD' },
  ],
  build: [
    { name: 'AI build', description: 'An assistant, smart search or automation, with guardrails and cost limits.', min: 2000, max: 8000, currency: 'USD' },
    { name: 'MVP build', description: 'A complete web or mobile product, ready for real users.', min: 6000, max: 20000, currency: 'USD' },
  ],
  care: [{ name: 'Care plan', description: 'Monitoring, a monthly health review and small fixes.', min: 299, currency: 'USD', monthly: true }],
};

export const board = {
  eyebrow: 'Request tracking',
  title: 'Every request, tracked.',
  intro: 'The moment you hit send you get a ticket. Every step lands on this board — and in your inbox.',
  columns: [
    { name: 'Inbox', tickets: [['#A-1046', 'Invoicing app · React + Node', 'Received today']] },
    { name: 'Bug review', tickets: [['#A-1044', 'Booking app · Bolt', 'First-bug video sent ✓']] },
    { name: 'Audit', tickets: [['#A-1041', 'Marketplace · Next.js + Postgres', 'Report due in 1 day']] },
    {
      name: 'Fixing',
      tickets: [
        ['#A-1038', 'CRM · Next.js', 'Day 4 of 7 · update posted today'],
        ['#A-1036', 'Support bot · AI feature', 'Day 2 of 5 · answers from docs'],
      ],
    },
    {
      name: 'Live ✓',
      tickets: [
        ['#A-1033', 'SaaS dashboard', 'Access leak + checkout fixed'],
        ['#A-1029', 'Course platform', 'Now named in AI answers'],
      ],
    },
  ],
  sampleNote: 'Sample tickets · real ones appear here, anonymised',
  ticket: {
    id: 'Ticket #A-1038',
    stack: 'CRM · Next.js',
    steps: [
      ['Request received', 'Mon', 'done'],
      ['First-bug video', 'Tue · sent ✓', 'done'],
      ['Audit', 'Wed–Thu · report ✓', 'done'],
      ['Fix booked', 'Fri · Launch-ready sprint', 'done'],
      ['Fixing', 'Day 4 of 7 · update posted today', 'now'],
      ['Live', 'Pay the second half once it works', 'next'],
      ['Care', 'Optional', 'next'],
    ] as [string, string, 'done' | 'now' | 'next'][],
  },
  loopTitle: 'How you’re kept in the loop',
  loop: [
    ['A ticket number', 'the second you hit send — no account needed.'],
    ['Your first-bug video', 'within 24 hours, with the fixed price to fix it.'],
    ['A written update every day', 'while work is in progress. No chasing.'],
    ['You confirm it’s live', 'before the second half is due.'],
  ],
  cta: { text: 'Start my request', href: FIRST_BUG },
};

export const free = {
  title: 'Start free.',
  tag: 'Free tools · no card, no call',
  cards: [
    {
      kind: 'Free · service',
      title: 'Free first-bug video',
      body: 'Send your app link. Anadi films a 3-minute video of the biggest risk he finds — within 24 hours. Five a week.',
      cta: { text: 'Find my first bug', href: FIRST_BUG },
      style: 'feature',
    },
    {
      kind: 'Free · tool',
      title: 'The Wrapper Test',
      body: '13 questions, about 3 minutes, no signup. Is your AI product defensible — or just a wrapper?',
      cta: { text: 'Take the test →', href: '/teardown' },
      style: 'plain',
    },
    {
      kind: 'Paid add-on',
      title: 'Recorded teardown',
      body: 'Took the Wrapper Test and want the fix? Anadi records a walkthrough of your product.',
      cta: { text: 'Start with the test', href: '/teardown' },
      style: 'dashed',
    },
    {
      kind: 'DIY',
      title: 'The Production Kit',
      body: 'Anadi’s rules and checklists for Claude Code, Cursor, Lovable and Bolt.',
      cta: { text: 'See the packs', href: '/products/production-kit' },
      style: 'dark',
    },
  ] as { kind: string; title: string; body: string; cta: Cta; style: 'feature' | 'plain' | 'dashed' | 'dark' }[],
  more: [
    { text: 'Supabase security check', href: '/scan' },
    { text: 'AI readiness checker', href: '/ai-readiness' },
    { text: 'Privacy self-check', href: '/dpdp/check' },
  ],
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
  items: [
    { q: 'What does it cost?', a: 'The first-bug video is free. The audit is $349 and credited in full toward the work. After that there are five fixed packages: Launch-ready sprint $1,500–$2,500, Full rescue $3,000–$6,000, AI build $2,000–$8,000, MVP build $6,000–$20,000 and the Care plan at $299/mo. No hourly billing.' },
    { q: 'Why is the audit paid when the first bug is free?', a: 'The video shows you one real problem. The audit checks everything and gives you a ranked plan — that takes a day or two of Anadi’s time. Book the fix within 30 days and every dollar is credited.' },
    { q: 'What if the audit finds nothing?', a: 'If there are no real, fixable issues, you get a full refund.' },
    { q: 'How does “pay when it’s live” work?', a: 'You pay half to start. The second half is due only once the fix is live and you’ve confirmed it works.' },
    { q: 'How will I know what’s happening?', a: 'You get a ticket number the moment you send your request. Every step shows in request tracking and in your inbox, with a written update every day while work is in progress.' },
    { q: 'What if you can’t fix it?', a: 'The price is fixed. If something wasn’t in the quote, you’re not billed for it.' },
    { q: 'Do you rebuild my app from scratch?', a: 'No. Only the broken parts get rewritten, so your features and design stay as they are.' },
    { q: 'What if my app is too far gone?', a: 'The audit will say so plainly. Sometimes a partial rebuild is cheaper than patching — you’ll know before you pay for anything.' },
    { q: 'Is my code safe with you?', a: 'An NDA is available on request, and you can revoke repo access as soon as the project ends.' },
    { q: 'Which tools and stacks do you support?', a: 'React, Next.js, React Native, Node.js and PostgreSQL products (plus Supabase and Firebase) — hand-written or built with AI tools like Cursor, Claude Code, Lovable, Bolt, v0 or Replit.' },
    { q: 'What do you need to start?', a: 'A link to your app. Repo access helps if you have it, but it isn’t required for the free first-bug video.' },
    { q: 'Is Bit a real person?', a: 'No — Bit is an AI assistant that helps you find the right fix. Anadi, a real engineer, reads every request and does the work himself.' },
  ],
};
