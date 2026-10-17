/**
 * The homepage's facts — services, prices, guarantees, free tools, FAQ — with
 * no imports, so a serverless function can load them.
 *
 * `bitsQuest.ts` builds the homepage content from these (adding icons and
 * links), and `lib/bit/knowledge.ts` builds Bit's AI prompt and its published
 * price list from the same arrays. `bitsQuest.ts` itself can't be loaded by a
 * function: it imports the portfolio data, which imports images.
 */

export type ServiceFacts = { tag: string; title: string; forYou: string; fixes: string[]; stats: string[][] };
export type PackageFacts = { name: string; duration: string; price: string; detail: string; badge?: string };
export type PriceGroupFacts = {
  label: string;
  title: string;
  blurb: string;
  style: 'dark' | 'highlight' | 'plain';
  packages: PackageFacts[];
  includes: string[];
};
export type FreeCardFacts = { kind: string; title: string; body: string; style: 'feature' | 'plain' | 'dashed' | 'dark' };

export const SERVICES: ServiceFacts[] = [
  {
    tag: 'Fix · rescue & launch',
    title: 'Fix it — or get it launch-ready',
    forYou: 'Something’s breaking — login, data, payments, deploys, speed — or you’re about to launch and need it to hold up.',
    fixes: ['Login, accounts and permissions', 'Data security and access rules', 'Payments, deploys and error tracking', 'Speed, crashes and stability'],
    stats: [['Audit', '$349'], ['Fix', '$1,500–$6,000'], ['Time', 'From 1 week']],
  },
  {
    tag: 'Build with AI',
    title: 'Add AI that actually works',
    forYou: 'You want AI in your product or workflow — without runaway costs, wrong answers or a demo that breaks in real use.',
    fixes: ['Assistants that answer from your data', 'Smart search and document reading', 'Agents and workflow automations', 'Guardrails, fallbacks and cost limits'],
    stats: [['AI build', '$2,000–$8,000'], ['MVP', '$6,000–$20,000'], ['Quote', 'Fixed']],
  },
  {
    tag: 'Keep it running',
    title: 'Keep it fast, safe and found',
    forYou: 'Your product is live and you want a senior engineer watching it — and buyers and AI search finding it.',
    fixes: ['Monitoring and a monthly health review', 'Small fixes and upgrades every month', 'Quarterly search-visibility re-check', 'Quarterly privacy check (GDPR · CCPA · DPDP)'],
    stats: [['Care', '$299/mo'], ['Term', 'Monthly'], ['Cancel', 'Anytime']],
  },
];

export const GUARANTEES: [string, string][] = [
  ['First bug free', 'A real issue in your app, on video, in 24h.'],
  ['Audit credited 100%', 'Every dollar counts toward the fix.'],
  ['Nothing found? Full refund', 'No real issues means you pay nothing.'],
  ['Pay the rest when it’s live', 'Half to start, half once it works.'],
];

export const PRICE_GROUPS: PriceGroupFacts[] = [
  {
    label: 'Step 1 · diagnose',
    title: 'Start here',
    blurb: 'Not sure what’s wrong? Get a clear, ranked diagnosis first.',
    style: 'dark',
    packages: [
      { name: 'Production audit', duration: '48 hours', price: '$349', detail: 'Reliability, search visibility and privacy — one plain-English report, ranked by business impact.' },
    ],
    includes: ['Your biggest risk found free, on video, in 24h', 'Credited 100% toward any package', 'Nothing found? Full refund'],
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
  },
];

export const FREE_CARDS: FreeCardFacts[] = [
  {
    kind: 'Free · service',
    title: 'Free first-bug video',
    body: 'Send your app link. Anadi films a 3-minute video of the biggest risk he finds — within 24 hours. Five a week.',
    style: 'feature',
  },
  {
    kind: 'Free · tool',
    title: 'The Wrapper Test',
    body: '13 questions, about 3 minutes, no signup. Is your AI product defensible — or just a wrapper?',
    style: 'plain',
  },
  {
    kind: 'Paid add-on · $149',
    title: 'Recorded teardown',
    body: 'Took the Wrapper Test and want the fix? Anadi records a 15–20 minute walkthrough of your product, plus a written fix list, in 48 hours. The $149 is credited in full toward the $349 audit or an AI build within 30 days.',
    style: 'dashed',
  },
  {
    kind: 'Free · DIY',
    title: 'The Production Kit',
    body: 'Anadi’s rules and checklists for Claude Code, Cursor, Lovable and Bolt. One free download, no sign-up.',
    style: 'dark',
  },
];

export const FREE_MORE: { text: string; href: string }[] = [
  { text: 'Supabase security check', href: '/scan' },
  { text: 'AI readiness checker', href: '/ai-readiness' },
  { text: 'Privacy self-check', href: '/dpdp/check' },
];

export const FAQ_ITEMS: { q: string; a: string }[] = [
  { q: 'What does it cost?', a: 'The first-bug video is free. The audit is $349 and credited in full toward the work. After that there are five fixed packages: Launch-ready sprint $1,500–$2,500, Full rescue $3,000–$6,000, AI build $2,000–$8,000, MVP build $6,000–$20,000 and the Care plan at $299/mo. No hourly billing.' },
  { q: 'Why is the audit paid when the first bug is free?', a: 'The video shows you one real problem. The audit checks everything and gives you a ranked plan — that takes a day or two of Anadi’s time. Book the fix within 30 days and every dollar is credited.' },
  { q: 'What if the audit finds nothing?', a: 'If there are no real, fixable issues, you get a full refund.' },
  { q: 'How does “pay when it’s live” work?', a: 'You pay half to start. The second half is due only once the fix is live and you’ve confirmed it works.' },
  { q: 'How will I know what’s happening?', a: 'You get a ticket number when your request is saved. Anadi keeps you updated by email at every step, with a written update every day while work is in progress.' },
  { q: 'What if you can’t fix it?', a: 'The price is fixed. If something wasn’t in the quote, you’re not billed for it.' },
  { q: 'Do you rebuild my app from scratch?', a: 'No. Only the broken parts get rewritten, so your features and design stay as they are.' },
  { q: 'What if my app is too far gone?', a: 'The audit will say so plainly. Sometimes a partial rebuild is cheaper than patching — you’ll know before you pay for anything.' },
  { q: 'Is my code safe with you?', a: 'An NDA is available on request, and you can revoke repo access as soon as the project ends.' },
  { q: 'Which tools and stacks do you support?', a: 'React, Next.js, React Native, Node.js and PostgreSQL products (plus Supabase and Firebase) — hand-written or built with AI tools like Cursor, Claude Code, Lovable, Bolt, v0 or Replit.' },
  { q: 'What do you need to start?', a: 'A link to your app. Repo access helps if you have it, but it isn’t required for the free first-bug video.' },
  { q: 'Is Bit a real person?', a: 'No — Bit is an AI assistant that helps you find the right fix. Anadi, a real engineer, reads every request and does the work himself.' },
];
