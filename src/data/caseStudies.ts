import signalShot from '@/assets/signal.webp';
import zeissShot from '@/assets/eiss.webp';
import iotiShot from '@/assets/ioti.webp';
import { SIGNAL_HREF } from './portfolio';

/**
 * The case studies behind `/work`.
 *
 * Two kinds, told two ways. A client project is work Anadi delivered while
 * employed: the end client is named as the client and the employer as where it
 * was delivered, and the page describes his part of it, not the company's. A
 * personal project is self-initiated, and its page is the arc of a real problem,
 * what had to be learned to solve it, what was built, and what it taught.
 *
 * `status` is the publishing gate. A `pending` study is written in full but
 * only renders under `npm run dev`, the same rule notes drafts follow, because
 * it is waiting on something only Anadi can confirm: an employer, permission to
 * name the client, a store link. `pending` lists exactly what, and any
 * unconfirmed fact in the copy is an `[Add …]` placeholder rather than a guess.
 * Numbers appear only where they were measured or are facts about the shipped
 * thing; a pending study carries none.
 */

export type Kind = 'client' | 'personal';
export type Platform = 'Web' | 'Mobile' | 'AI';

export type Decision = { head: string; body: string };

export type Study = {
  slug: string;
  kind: Kind;
  platform: Platform;
  status: 'live' | 'pending';
  /** What publishing waits on. Rendered as a dev-only banner. */
  pending?: string[];

  /** The project's own name, for the card and the context strip. */
  name: string;
  /** The page's H1: the result or the real-world problem, not the project name. */
  title: string;
  /** `<title>`. Kept under ~60 characters. */
  seoTitle: string;
  /** Meta description and the card's standfirst. */
  description: string;
  /** One line under the card title: what came of it. */
  result: string;

  /** Client projects only. */
  client?: string;
  deliveredAt?: string;

  role: string;
  timeline: string;
  platformLabel: string;
  stack: string[];
  link?: { href: string; label: string };

  /** The problem, and who has it. 2–3 sentences, split into paragraphs. */
  problem: string[];
  /** Personal projects only: what had to be learned to solve it. */
  learned?: string[];
  /** What was built, and the decisions worth defending, each with its reason. */
  built: string[];
  decisions: Decision[];
  /** Public material only. `note` says where it's from. */
  proof?: { src: string; alt: string; note: string };
  /** A table of facts, for studies whose proof is data rather than a picture. */
  proofTable?: { caption: string; head: [string, string, string]; rows: [string, string, string][] };
  /** Verified results, or the change described in words. Never an estimate. */
  results: string[];
  /** Personal projects only: what it taught, what would change. */
  lessons?: string[];

  cta: { lead: string; label: string; href: string };
};

/** The soft CTA every client project ends on. */
const CLIENT_CTA = {
  lead: 'Have an app like this that needs to hold up in production?',
  label: 'Get a free audit',
  href: '/rescue/audit',
};

export const studies: Study[] = [
  /* --- personal --------------------------------------------------------- */

  {
    slug: 'wrapper-test',
    kind: 'personal',
    platform: 'AI',
    status: 'live',
    name: 'The Wrapper Test',
    title: 'Can a founder tell a real AI product from a thin wrapper?',
    seoTitle: 'The Wrapper Test: a diagnostic for AI products',
    description:
      'A free 13-question diagnostic that scores an AI product on defensibility, failure design, cost floor and evaluation, and writes back a nine-section breakdown.',
    result: 'A free, 13-question diagnostic with a written nine-section breakdown and shareable scores.',
    role: 'Solo: questions, scoring, build',
    timeline: 'Sep 2026',
    platformLabel: 'Web',
    stack: ['React', 'TypeScript', 'vite-react-ssg', 'Vercel Functions', 'Resend', 'Vitest'],
    link: { href: '/teardown', label: 'Take the Wrapper Test' },
    problem: [
      'A lot of AI products are a prompt around someone else’s model. The founders building them often can’t tell whether theirs is one of those, and the people they ask either sell them something or tell them it’s fine.',
      'The useful question is narrower than “is it good”: what does the product do that the model alone doesn’t, what happens when the model is wrong, what does each request cost at the floor, and how would anyone know it got worse.',
    ],
    learned: [
      'How to turn a judgement call into a scoring model someone can check: thirteen questions, each weighted 0–3, rolled up into four axes and nine sections, with the thresholds printed on the result so a score can be argued with.',
      'How to keep “I don’t know” honest. Every question has a fourth option that scores zero but is reported separately, because an unknown is a finding in its own right and folding it into a low score hides it.',
      'How to prerender share pages from a pure function, so a link to a result carries its own title and card image without a server.',
    ],
    built: [
      'A single page at /teardown. The intro and first question are in the prerendered HTML, so the proposition is readable before any JavaScript runs. Answers stay in the browser until the reader asks for the report by email.',
    ],
    decisions: [
      {
        head: 'Scoring is arithmetic only',
        body: 'The scoring module returns numbers and never a sentence. That keeps its tests pure and leaves one place in the code where words reach a reader, which is the one place the tone rules have to be enforced.',
      },
      {
        head: 'Diagnose, never prescribe',
        body: 'The breakdown says what the answers show, not what to do about it. A test fails the build if any finding uses advice phrasing like “you should” or “make sure”. Advice without the context of the product is guessing.',
      },
      {
        head: 'The server re-scores, it never trusts',
        body: 'The email function takes the raw answers, thirteen small integers, validates them exhaustively and re-runs the same modules the browser ran. There is one implementation of the scoring in the system, not two that can drift.',
      },
      {
        head: 'The gate is a courtesy, not a lock',
        body: 'The report is computed in the browser from data already in the bundle. Moving it server-side to protect something given away for free would cost a round trip on every reveal.',
      },
      {
        head: 'Forty prerendered result pages',
        body: 'One per reachable score, resolved from the scorer at build time, each with its own title and share card. They are noindex: forty near-duplicates would dilute the pages worth finding.',
      },
    ],
    results: [
      'Live and free at anadithakur.in/teardown, with no account.',
      'Scoring, report and email payload are covered by unit tests, including the no-prescriptions rule.',
    ],
    lessons: [
      'Writing the thresholds onto the result page changed how I wrote the questions. Once the reader can check the arithmetic, every weight has to be defensible.',
    ],
    cta: { lead: 'Thirteen questions, about three minutes.', label: 'Take the Wrapper Test', href: '/teardown' },
  },

  {
    slug: 'production-kit',
    kind: 'personal',
    platform: 'AI',
    status: 'live',
    name: 'The Production Kit',
    title: 'The production rules AI coding tools skip, written down',
    seoTitle: 'The Production Kit: rules AI coding tools skip',
    description:
      'Rules, Claude Code skills, templates and checklists that make Claude Code, Cursor, Lovable and Bolt write React, Next.js and Supabase code that survives real users.',
    result: 'Seven Claude Code skills, rules for four AI tools, and a sample RLS audit. Free download.',
    role: 'Solo: rules, skills, templates, delivery',
    timeline: 'Sep 2026',
    platformLabel: 'Web',
    stack: ['Claude Code skills', 'Cursor rules', 'React', 'Next.js', 'Supabase', 'Stripe', 'Resend'],
    link: { href: '/products/production-kit', label: 'Get the kit' },
    problem: [
      'People building with AI tools ship what the tool writes, and the tools skip the same things: row-level security, where keys live, auth redirects, server-side checks. Nothing in the demo shows it.',
      'The fixes are well known to anyone who has shipped a production app. They just aren’t written anywhere the AI tool reads.',
    ],
    learned: [
      'How each tool takes instructions: CLAUDE.md and skills for Claude Code, .mdc rules that load automatically in Cursor, project-knowledge files and step-by-step prompts for Lovable and Bolt.',
      'How to write a rule a model follows rather than acknowledges: specific, testable, with the check that proves it was done.',
      'Selling and delivering digital files: Stripe Checkout, a webhook, signed download links and release versioning.',
    ],
    built: [
      'Project rules for Claude Code, Cursor, Lovable and Bolt covering security, Supabase RLS, auth, environment variables, deployment, database changes, errors, performance, SEO and UI quality.',
      'Seven Claude Code skills: RLS audit, pre-deploy check, auth flow fix, AI visibility, safe change, plan feature and slop check. Drop-in templates for Vite + React and Next.js, plus checklists and SQL.',
    ],
    decisions: [
      {
        head: 'Every rule ships with its check',
        body: 'The RLS audit skill does not stop at writing policies. It tests as a logged-out visitor and as a second user, because a policy that looks right and leaks is the common case.',
      },
      {
        head: 'The same rules in four formats',
        body: 'One set of rules, adapted to how each tool loads instructions. Someone who switches from Lovable to Cursor keeps the same guardrails.',
      },
      {
        head: 'Free, and no email',
        body: 'It was sold as five packs, then made a free download with no sign-up. The people most likely to use it are founders building with AI tools, the same people who might need a rescue later; a paywall kept them out.',
      },
    ],
    proofTable: {
      caption: 'From the sample RLS audit in the kit: a hole closing, and one normal action still working.',
      head: ['Test', 'Before', 'After'],
      rows: [
        ['Logged-out visitor reads tasks', '3 rows', '0 rows'],
        ['Logged-out visitor deletes Ben’s project', 'deleted', 'permission denied'],
        ['Ben makes himself admin', 'admin', 'permission denied'],
        ['Ben uploads into Asha’s folder', 'allowed', 'blocked by row-level security'],
        ['Asha renames her own project', '1 row changed', '1 row changed'],
      ],
    },
    results: ['A free download at anadithakur.in/products/production-kit, versioned, with no account.'],
    lessons: [
      'Writing rules for a model is writing for a reader who does exactly what the words say, so every rule ends in a check that shows whether it was followed.',
      'Paid packs and checkout were built before anyone had asked to pay. In September 2026 the kit went free.',
    ],
    cta: { lead: 'One download, no sign-up.', label: 'Get the Production Kit', href: '/products/production-kit' },
  },

  {
    slug: 'signal',
    kind: 'personal',
    platform: 'AI',
    status: 'live',
    name: 'Signal · AI Lead Radar',
    title: 'A lead score you can argue with',
    seoTitle: 'Signal: lead scoring that shows its reasons',
    description:
      'Signal scores leads 0–100 with the evidence beside the number, and drafts a first email from that evidence for a human to review. Built with Next.js, FastAPI, Claude and Supabase.',
    result: 'Scores leads 0–100 with a stated reason, and drafts outreach for a human to approve.',
    role: 'Solo: product, pipeline, interface',
    timeline: '2025',
    platformLabel: 'Web',
    stack: ['Next.js', 'FastAPI', 'Claude API', 'Supabase'],
    link: SIGNAL_HREF ? { href: SIGNAL_HREF, label: 'Open Signal (login required)' } : undefined,
    problem: [
      'Founders doing their own outbound lose hours on leads that were never a fit, then write each first email from scratch.',
      'Lead tools hand over a list and a confidence percentage nobody can question. You either trust the number or throw the list away.',
    ],
    learned: [
      'The Claude API: getting a score and its reason back as structured output, and keeping the model to evidence it was given.',
      'FastAPI for the pipeline, and how to keep a scraper-fed system honest when sources fail.',
      'Scoring design: what a score has to carry for a person to act on it.',
    ],
    built: [
      'A pipeline that collects hiring signals from five sources (LinkedIn, job boards, Crunchbase, Google Maps and remote boards), scores each lead 0–100 with the evidence that produced the score, and drafts a first email from that evidence into a review queue.',
      'A dashboard that moves a lead through seven stages, from new to client.',
    ],
    decisions: [
      {
        head: 'A score has to carry its reason',
        body: 'The evidence sits beside the number, in the lead’s own words: “hiring a Buyer, Indirect on LinkedIn”. You argue with the signal, not the digit, and when you disagree you know which input to fix.',
      },
      {
        head: 'Evidence first, prose second',
        body: 'The scrape keeps only what can be quoted back, and the draft is written from that and nothing else, so the opener names the job they posted instead of praising their commitment to excellence.',
      },
      {
        head: 'It writes a draft, not a send',
        body: 'Claude fills a review queue with a subject, a body and two variants. Marking a lead contacted is a person pressing a button. The automation is worth having because it stops one step short.',
      },
      {
        head: 'Failures stay visible',
        body: 'Scrapers break. The run log shows each failure instead of retrying quietly, so a thin day of leads is explained rather than mysterious.',
      },
    ],
    proof: { src: signalShot, alt: 'Signal’s lead table: companies with a 0–100 score and the hiring signal behind it.', note: 'Signal’s lead table.' },
    results: [
      'Signal has not been used for live outreach yet, so there are no reply rates or pipeline numbers to report.',
      'What it does today: every lead carries a score and the evidence behind it, and every draft is written from that evidence and waits for a person to approve it.',
    ],
    lessons: [
      'It is slower per lead than tools that don’t explain themselves. That trade was made on purpose, and I would make it again.',
    ],
    cta: { lead: 'Thinking about an AI system like this for your business?', label: 'Talk to ANTA', href: 'https://theanta.com' },
  },

  /* --- client, web ------------------------------------------------------ */

  {
    slug: 'zeiss-microscopy',
    kind: 'client',
    platform: 'Web',
    status: 'pending',
    pending: [
      'Permission to name ZEISS as a client on a case study page.',
      'Which employer delivered it: ZenQua or Precious Infosystem (the portfolio journey says Precious Infosystem).',
      'Your role title and dates.',
    ],
    name: 'ZEISS Microscopy',
    title: 'One component system for every ZEISS light microscope line',
    seoTitle: 'ZEISS Microscopy: a React product platform',
    description:
      'A React component system for the ZEISS light microscope product pages: reusable across upright, inverted and digital lines, wired to content APIs so copy ships without a deploy.',
    result: 'Reusable components across upright, inverted and digital product lines; content ships without a deploy.',
    client: 'ZEISS',
    deliveredAt: '[Add employer]',
    role: '[Add role, e.g. Frontend developer]',
    timeline: '[Add dates]',
    platformLabel: 'Web',
    stack: ['React', 'Component library', 'Content APIs', 'ZEISS global design system'],
    link: { href: 'https://www.zeiss.com/microscopy/us/products/light-microscopes.html', label: 'ZEISS light microscopes' },
    problem: [
      'ZEISS sells many lines of scientific light microscope, each with its own product pages. Building each page by hand meant the same parts were rebuilt with small differences, and every copy change waited on a developer.',
    ],
    built: [
      'A set of reusable React components that render the product pages dynamically for each microscope line, connected to content APIs so editors change content without a code deployment.',
    ],
    decisions: [
      {
        head: 'Components shared across product categories',
        body: 'Upright, inverted and digital microscopes use the same components with different content, so a fix or improvement lands on every line at once.',
      },
      {
        head: 'Content through APIs, not code',
        body: 'Content APIs feed the React frontend, so a copy or spec change is an edit, not a release.',
      },
      {
        head: 'Accessible markup in the global design system',
        body: 'Components follow the ZEISS global design system with accessible markup built in, so each new page inherits it instead of re-earning it.',
      },
    ],
    proof: { src: zeissShot, alt: 'A public ZEISS light microscope product page.', note: 'Public product page on zeiss.com.' },
    results: ['[Add measured result, or describe the change in words once confirmed]'],
    cta: CLIENT_CTA,
  },

  {
    slug: 'iot-industry',
    kind: 'client',
    platform: 'Web',
    status: 'pending',
    pending: ['Permission to name IoT Industry as a client.', 'Which employer delivered it.', 'Your role title and dates.'],
    name: 'IoT Industry',
    title: 'Live factory sensor data a manager can read at a glance',
    seoTitle: 'IoT Industry: a real-time factory dashboard',
    description:
      'A React dashboard for factory managers, fed by Node and Express APIs streaming real-time machine sensor data into reusable chart and table components.',
    result: 'Real-time machine data streamed into reusable charts and tables for factory managers.',
    client: 'IoT Industry',
    deliveredAt: '[Add employer]',
    role: '[Add role]',
    timeline: '[Add dates]',
    platformLabel: 'Web',
    stack: ['React', 'Node.js', 'Express', 'MongoDB', 'Real-time data'],
    link: { href: 'https://ioti.io/', label: 'ioti.io' },
    problem: [
      'Factory machines produce a constant stream of sensor readings. Raw, that stream is useless to the manager who has to decide what to act on today.',
    ],
    built: [
      'Node and Express APIs that stream real-time sensor data to a React frontend, and a set of reusable chart and table components that turn it into interactive views for factory managers.',
    ],
    decisions: [
      {
        head: 'Reusable chart and table components',
        body: 'Every machine type reports different data. Building the charts and tables once, driven by configuration, meant a new machine was a new configuration rather than a new screen.',
      },
      {
        head: 'Streaming instead of polling',
        body: 'Sensor data reaches the UI as it arrives, so the dashboard shows the floor as it is, not as it was on the last refresh.',
      },
      {
        head: 'Built for the browser tab it lives in',
        body: 'A dashboard that stays open all shift has to keep a steady memory footprint under a continuous stream of updates.',
      },
    ],
    proof: { src: iotiShot, alt: 'The public IoT Industry site.', note: 'Public site at ioti.io.' },
    results: ['[Add measured result, or describe the change in words once confirmed]'],
    cta: CLIENT_CTA,
  },

  {
    slug: 'appwalker',
    kind: 'client',
    platform: 'Web',
    status: 'pending',
    pending: ['Permission to name AppWalker as a client.', 'Which employer delivered it.', 'Your role title and dates.'],
    name: 'AppWalker',
    title: 'A recipe platform built to take new features without a rewrite',
    seoTitle: 'AppWalker: a React recipe-sharing platform',
    description:
      'The React frontend for a recipe-sharing and culinary community platform: recipe creation, step-by-step instructions and ingredient management, with an editor-friendly admin.',
    result: 'Recipe creation, step-by-step instructions and ingredient management in React.',
    client: 'AppWalker',
    deliveredAt: '[Add employer]',
    role: '[Add role]',
    timeline: '[Add dates]',
    platformLabel: 'Web',
    stack: ['React', 'Component architecture'],
    link: { href: 'https://appwalker-technology.com/', label: 'appwalker-technology.com' },
    problem: [
      'A culinary community needs recipes that are easy to write and easy to follow, and a team that can keep adding features without breaking what is there.',
    ],
    built: [
      'The React frontend for creating recipes, writing step-by-step instructions and managing ingredients, with an admin that editors can use without a developer.',
    ],
    decisions: [
      {
        head: 'Component structure planned for what comes next',
        body: 'The recipe, step and ingredient components were separated so features planned later could be added without reworking the ones already shipped.',
      },
      {
        head: 'An admin built for editors',
        body: 'Content is managed by people who don’t write code, so the admin was built around their tasks rather than the data model.',
      },
    ],
    results: ['[Add measured result, or describe the change in words once confirmed]'],
    cta: CLIENT_CTA,
  },

  /* --- client, mobile --------------------------------------------------- */

  {
    slug: 'sonee-sports',
    kind: 'client',
    platform: 'Mobile',
    status: 'pending',
    pending: [
      'Permission to name Sonee Sports as a client.',
      'Which employer delivered it.',
      'App Store and Play Store links.',
      'Your role title and dates.',
      'Whether the “+15% monthly sales” figure has a source you can share. It is not used until then.',
    ],
    name: 'Sonee Sports',
    title: 'A sports store and loyalty app, built from scratch for iOS and Android',
    seoTitle: 'Sonee Sports: React Native e-commerce app',
    description:
      'An e-commerce and loyalty rewards app for Android and iOS, built from scratch in React Native CLI: product listing, cart, checkout and performance work driven by analytics.',
    result: 'Product listing, cart, checkout and loyalty rewards on Android and iOS, from an empty repo.',
    client: 'Sonee Sports',
    deliveredAt: '[Add employer]',
    role: 'Built the React Native app [confirm title]',
    timeline: '[Add dates]',
    platformLabel: 'Android & iOS',
    stack: ['React Native CLI', 'REST APIs', 'Analytics'],
    link: undefined,
    problem: [
      'A sports retailer wanted its store and its loyalty rewards in one app, on both platforms, that stays fast on the phones its customers actually own.',
    ],
    built: [
      'The app, from scratch in React Native CLI: product listing, cart and checkout flows on REST APIs, and the loyalty rewards around them.',
    ],
    decisions: [
      {
        head: 'React Native CLI rather than Expo',
        body: '[Add the reason, e.g. native modules the payment or loyalty integration needed]',
      },
      {
        head: 'Performance work from analytics, not guesses',
        body: 'Profiling and code-level optimisations targeted the screens the analytics showed people actually used.',
      },
      {
        head: 'One layout system across screen sizes',
        body: 'The UI was built to stay consistent from small Android phones to large iPhones, so no screen size gets a broken checkout.',
      },
    ],
    results: ['[Add measured result with its source, or describe the change in words]'],
    cta: CLIENT_CTA,
  },

  {
    slug: 'xpand',
    kind: 'client',
    platform: 'Mobile',
    status: 'pending',
    pending: [
      'Permission to name XPAND as a client.',
      'Which employer delivered it.',
      'App Store and Play Store links.',
      'Your role title and dates.',
    ],
    name: 'XPAND',
    title: 'An ed-tech app that looks right on every phone it runs on',
    seoTitle: 'XPAND: a React Native ed-tech app',
    description:
      'A cross-platform ed-tech app for Android and iOS in React Native and Redux, rendering educational content from REST APIs with state that holds across screens and sessions.',
    result: 'Educational content on iOS and Android, with progress that holds across sessions.',
    client: 'XPAND',
    deliveredAt: '[Add employer]',
    role: '[Add role]',
    timeline: '[Add dates]',
    platformLabel: 'Android & iOS',
    stack: ['React Native', 'Redux', 'REST APIs'],
    link: undefined,
    problem: [
      'Learners use whatever phone they have. An ed-tech app has to lay out the same lesson properly on each of them, and remember where the learner left off.',
    ],
    built: ['The cross-platform UI, the REST integration that renders educational content, and the Redux store behind it.'],
    decisions: [
      {
        head: 'Handle device differences in the layout layer',
        body: 'iOS and Android lay things out differently. Solving it once in shared layout components kept the screens themselves free of platform checks.',
      },
      {
        head: 'Redux for state across screens and sessions',
        body: 'A learner’s place in a course has to survive navigation and restarts, so it lives in one store rather than in each screen.',
      },
    ],
    results: ['[Add measured result, or describe the change in words once confirmed]'],
    cta: CLIENT_CTA,
  },

  {
    slug: 'la-pte',
    kind: 'client',
    platform: 'Mobile',
    status: 'pending',
    pending: [
      'Permission to name LA-PTE as a client.',
      'Which employer delivered it.',
      'App Store and Play Store links.',
      'Your role, what you built, and dates.',
      'Whether any of the learner, download or engagement numbers have a source you can share. None are used until then.',
    ],
    name: 'LA-PTE',
    title: 'PTE exam practice in a phone-sized app',
    seoTitle: 'LA-PTE: a React Native PTE prep app',
    description: 'A React Native app for Android and iOS that helps students prepare for the PTE Academic and PTE Core English exams.',
    result: 'PTE Academic and Core preparation on Android and iOS.',
    client: 'LA-PTE',
    deliveredAt: '[Add employer]',
    role: '[Add role]',
    timeline: '[Add dates]',
    platformLabel: 'Android & iOS',
    stack: ['React Native'],
    link: undefined,
    problem: [
      'Students preparing for the PTE exams want to practise in the gaps of a day, which means on their phone.',
    ],
    built: ['[Add what you built on the app]'],
    decisions: [{ head: '[Add a decision]', body: '[Add the reason]' }],
    results: ['[Add measured result, or describe the change in words once confirmed]'],
    cta: CLIENT_CTA,
  },
];

/** What production shows: live studies only. Dev shows everything, badged. */
export const visibleStudies: Study[] = import.meta.env.PROD ? studies.filter((s) => s.status === 'live') : studies;

export const studyPath = (s: Study) => `/work/${s.slug}`;

export const kindLabel: Record<Kind, string> = { client: 'CLIENT PROJECT', personal: 'PERSONAL PROJECT' };
