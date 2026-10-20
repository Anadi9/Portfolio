/**
 * The homepage's facts — services, packages, guarantees, free tools, FAQ — with
 * no imports except the promise list, so a serverless function can load them.
 *
 * The audit is the only price the site publishes. Every other package is
 * quoted per project, so its `price` says how it's quoted, never an amount,
 * and Bit's price guard (`lib/bit/prices.ts`) rejects any other figure.
 *
 * `bitsQuest.ts` builds the homepage content from these (adding icons and
 * links), and `lib/bit/knowledge.ts` builds Bit's AI prompt and its published
 * price list from the same arrays. `bitsQuest.ts` itself can't be loaded by a
 * function: it imports the portfolio data, which imports images.
 */

import { promiseHours } from './promises.js';

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
    stats: [['Audit', '$349'], ['Fix', 'Fixed quote'], ['Time', 'From 1 week']],
  },
  {
    tag: 'Build with AI',
    title: 'Add AI that actually works',
    forYou: 'You want AI in your product or workflow — without runaway costs, wrong answers or a demo that breaks in real use.',
    fixes: ['Assistants that answer from your data', 'Smart search and document reading', 'Agents and workflow automations', 'Guardrails, fallbacks and cost limits'],
    stats: [['AI build', '1–4 weeks'], ['MVP', '4–8 weeks'], ['Quote', 'Fixed']],
  },
  {
    tag: 'Keep it running',
    title: 'Keep it fast, safe and found',
    forYou: 'Your product is live and you want a senior engineer watching it — and buyers and AI search finding it.',
    fixes: ['Monitoring and a monthly health review', 'Small fixes and upgrades every month', 'Quarterly search-visibility re-check', 'Quarterly privacy check (GDPR · CCPA · DPDP)'],
    stats: [['Care', 'Quoted'], ['Term', 'Monthly'], ['Cancel', 'Anytime']],
  },
];

export const GUARANTEES: [string, string][] = [
  ['First bug free', `A real issue in your app, on video, in ${promiseHours('first_bug_video')}h.`],
  ['A ranked plan', 'The audit puts every issue in order: fix now, risky, can wait.'],
  ['One fixed quote', 'Agreed before any work starts.'],
  ['Daily updates', 'In writing, every day while the work is in progress.'],
];

export const PRICE_GROUPS: PriceGroupFacts[] = [
  {
    label: 'Step 1 · diagnose',
    title: 'Start here',
    blurb: 'Not sure what’s wrong? Get a clear, ranked diagnosis first.',
    style: 'dark',
    packages: [
      { name: 'Production audit', duration: `${promiseHours('audit_report')} hours`, price: '$349', detail: 'Reliability, search visibility and privacy — one plain-English report, ranked by business impact.' },
    ],
    includes: [`Your biggest risk found free, on video, in ${promiseHours('first_bug_video')}h`, 'Every issue ranked: fix now, risky, can wait', 'A fixed quote for the fix'],
  },
  {
    label: 'Step 2 · fix',
    title: 'Fix',
    blurb: 'Make a broken or risky app stable, secure and launch-ready.',
    style: 'highlight',
    packages: [
      { name: 'Launch-ready sprint', duration: '1 week', price: 'Fixed quote', detail: 'Up to three problem areas fixed, tested and shipped.', badge: 'Where most people start' },
      { name: 'Full rescue', duration: '2–3 weeks', price: 'Fixed quote', detail: 'Everything the audit found, plus tests and monitoring.' },
    ],
    includes: ['Quoted after the audit', 'Daily written updates', 'Tested before it ships'],
  },
  {
    label: 'Build',
    title: 'Build with AI',
    blurb: 'Add AI to your product, or build a new one from zero.',
    style: 'plain',
    packages: [
      { name: 'AI build', duration: '1–4 weeks', price: 'Fixed quote', detail: 'An assistant, smart search or automation — with guardrails and cost limits.' },
      { name: 'MVP build', duration: '4–8 weeks', price: 'Fixed quote', detail: 'A complete web or mobile product, ready for real users.' },
    ],
    includes: ['Fixed quote after a short scoping call', 'Weekly demos as it’s built', 'Guardrails and cost limits built in'],
  },
  {
    label: 'Ongoing',
    title: 'Keep it running',
    blurb: 'A senior engineer looking after your live product.',
    style: 'plain',
    packages: [
      { name: 'Care plan', duration: 'Monthly', price: 'Quoted monthly', detail: 'Monitoring, a monthly health review and small fixes included.' },
    ],
    includes: ['Quarterly visibility and privacy re-check', 'Priority response when something breaks', 'Cancel anytime'],
  },
];

export const FREE_CARDS: FreeCardFacts[] = [
  {
    kind: 'Free · service',
    title: 'Free first-bug video',
    body: `Send your app link. Anadi films a 3-minute video of the biggest risk he finds — within ${promiseHours('first_bug_video')} hours. Five a week.`,
    style: 'feature',
  },
  {
    kind: 'Free · tool',
    title: 'The Wrapper Test',
    body: '13 questions, about 3 minutes, no signup. Is your AI product defensible — or just a wrapper?',
    style: 'plain',
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
  { q: 'What does it cost?', a: 'The first-bug video is free. The production audit is $349. Everything after that (a fix, an AI build or the Care plan) gets one fixed quote for your project before any work starts.' },
  { q: 'Why is the audit paid when the first bug is free?', a: 'The video shows you one real problem. The audit checks everything and gives you a ranked plan — that takes a day or two of Anadi’s time.' },
  { q: 'How is the fix priced?', a: 'After the audit, Anadi sends one fixed quote for the work it found. Nothing starts until you agree to it.' },
  { q: 'How will I know what’s happening?', a: 'You get a ticket number when your request is saved. Anadi keeps you updated by email at every step, with a written update every day while work is in progress.' },
  { q: 'What if you can’t fix it?', a: 'The quote is fixed and says exactly what’s included. Anything outside it is agreed with you first.' },
  { q: 'Do you rebuild my app from scratch?', a: 'No. Only the broken parts get rewritten, so your features and design stay as they are.' },
  { q: 'What if my app is too far gone?', a: 'The audit will say so plainly. Sometimes a partial rebuild is cheaper than patching — you’ll know before any work starts.' },
  { q: 'Is my code safe with you?', a: 'An NDA is available on request, and you can revoke repo access as soon as the project ends.' },
  { q: 'Which tools and stacks do you support?', a: 'React, Next.js, React Native, Node.js and PostgreSQL products (plus Supabase and Firebase) — hand-written or built with AI tools like Cursor, Claude Code, Lovable, Bolt, v0 or Replit.' },
  { q: 'What do you need to start?', a: 'A link to your app. Repo access helps if you have it, but it isn’t required for the free first-bug video.' },
  { q: 'Is Bit a real person?', a: 'No — Bit is an AI assistant that helps you find the right fix. Anadi, a real engineer, reads every request and does the work himself.' },
];
