/**
 * Bit's conversation: a small, pure state machine ported by hand from the
 * design handoff (`design/bits-quest/content/bit-logic.reference.js`: `nodes()`,
 * `reply()`, `classify()` and the four qualification questions).
 *
 * What changed from the prototype, on purpose: Bit never invents a ticket
 * number or claims a request was sent. Every ending hands off to something real
 * (the first-bug form, an email to Anadi with the answers filled in, or a page
 * section), and says which.
 */
import { site } from '@/data/portfolio';

export type NodeId =
  | 'start' | 'prod' | 'prod2' | 'prod3' | 'prod4' | 'vis' | 'vis2' | 'dpdp' | 'dpdp2' | 'free' | 'teardown' | 'kit'
  | 'ask' | 'contact' | 'recProd' | 'recVis' | 'recDpdp' | 'recAi' | 'recKit' | 'blog' | 'hunt'
  | 'q1' | 'q2' | 'q3' | 'q4' | 'qurl' | 'notyet' | 'ai' | 'ai2' | 'ai3' | 'care';

/** Where an option leads: another node, the qualification check, or a real action outside the chat. */
export type Target =
  | { node: NodeId }
  | { qcheck: true }
  | { href: string }
  | { section: string; event?: { name: string; detail?: unknown } };

export type Option = { label: string; to: Target };

export type Answers = Partial<Record<'stack' | 'live' | 'scope' | 'asked' | 'js' | 'pd' | 'consent' | 'kitTool' | 'users' | 'impact' | 'when' | 'aiwant' | 'aistage' | 'budget', string>>;

export type Rec = { title: string; price: string; notes: string[]; actions: Option[] };

export type Message =
  | { who: 'bit'; text: string }
  | { who: 'you'; text: string }
  | { who: 'rec'; rec: Rec }
  | { who: 'links'; links: Option[] }
  /** The in-chat ticket form. Active only while it is the last form in the log and the chat is still at its node. */
  | { who: 'form'; kind: 'first_bug' | 'question' };

type Node = { say?: string; key?: keyof Answers; opts: Option[] };

export const FIRST_BUG = '/audit?type=app';
/** First-bug form with symptoms pre-ticked (indexes into `SYMPTOMS` in `lib/rescue/intake`). */
const firstBug = (symptoms: number[] = []) => (symptoms.length ? `${FIRST_BUG}&s=${symptoms.join(',')}` : FIRST_BUG);

const LABELS: Record<keyof Answers, string> = {
  stack: 'Built with',
  live: 'Live?',
  scope: 'Scope',
  asked: 'Asked an AI?',
  js: 'JavaScript app?',
  pd: 'Personal data?',
  consent: 'Consent today',
  kitTool: 'Builds with',
  users: 'Users',
  impact: 'If it breaks',
  when: 'Fix by',
  aiwant: 'AI should',
  aistage: 'Stage',
  budget: 'Budget',
};

/** A real email to Anadi with everything Bit has learned, so nothing is retyped. */
export function mailto(subject: string, ans: Answers, extra?: string) {
  const lines = (Object.keys(ans) as (keyof Answers)[]).map((k) => `${LABELS[k]}: ${ans[k]}`);
  const body = [`Hi Anadi,`, '', extra ?? 'Bit sent me here. My answers:', '', ...lines, '', 'App link: ', ''].join('\n');
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

const to = (node: NodeId): Target => ({ node });
const o = (label: string, target: Target): Option => ({ label, to: target });
const tour: Option = o('Walk me through the site', { section: 'services', event: { name: 'bq:tour' } });
const startOver: Option = o('Start over', to('start'));

const BUDGET = ['Under $2,000', '$2,000–$5,000', '$5,000–$20,000', 'Not sure yet'];

export const NODES: Record<NodeId, Node> = {
  start: {
    say: 'Hi! I’m Bit, Anadi’s AI assistant. What’s going on with your app?',
    opts: [
      o('Find my app’s first bug — free', to('hunt')),
      o('Something’s breaking in my app', to('prod')),
      o('I’m about to launch', to('prod')),
      o('Add AI to my product', to('ai')),
      o('Look after my live app', to('care')),
      o('Help me build a package', { section: 'pricing', event: { name: 'bq:builder' } }),
      o('Show me the free stuff', to('free')),
      tour,
    ],
  },
  prod: {
    say: 'Got it. How was it built?',
    key: 'stack',
    opts: ['Hand-coded (React / Node)', 'Cursor or Claude Code', 'Lovable, Bolt or v0', 'Replit', 'Not sure'].map((l) => o(l, to('prod2'))),
  },
  prod2: { say: 'Is it live with real users?', key: 'live', opts: ['Not yet — launching soon', 'Yes, under 100 users', 'Yes, 100+ users'].map((l) => o(l, to('prod3'))) },
  prod3: { say: 'One known problem, or lots of small ones?', key: 'scope', opts: ['One specific thing', 'Lots, or not sure'].map((l) => o(l, to('prod4'))) },
  prod4: { say: 'Optional: roughly what budget do you have in mind? I won’t quote from it — Anadi confirms a fixed price after the free first-bug video.', key: 'budget', opts: BUDGET.map((l) => o(l, to('recProd'))) },
  vis: { say: 'Have you asked an AI assistant for the best tool in your category?', key: 'asked', opts: ['Yes — we’re missing', 'Not yet'].map((l) => o(l, to('vis2'))) },
  vis2: { say: 'Is your site a JavaScript app (React, Next, Lovable…)?', key: 'js', opts: ['Yes', 'No', 'Not sure'].map((l) => o(l, to('recVis'))) },
  dpdp: { say: 'Do you collect personal data — names, emails, payments?', key: 'pd', opts: ['Yes', 'Not sure'].map((l) => o(l, to('dpdp2'))) },
  dpdp2: { say: 'How do people give consent today?', key: 'consent', opts: ['Pre-ticked box, or no consent', 'We ask properly', 'Not sure'].map((l) => o(l, to('recDpdp'))) },
  free: { say: 'Free stuff, coming up. Tap one:', opts: [o('Back to start', to('start')), tour] },
  teardown: {
    say: 'The recorded teardown is a $149 add-on to the Wrapper Test: a 15–20 minute recorded walkthrough of your product plus a written fix list, in 48 hours. The $149 is credited in full toward the $349 audit or an AI build within 30 days. Take the free test first — then he knows where to look.',
    opts: [o('Take the Wrapper Test', { href: '/teardown' }), o('Ask Anadi about a teardown', { href: mailto('Recorded teardown', {}) }), o('Back to start', to('start'))],
  },
  kit: {
    say: 'The Production Kit has Anadi’s rules and checklists for Claude Code, Cursor, Lovable and Bolt. Which tool do you build with?',
    key: 'kitTool',
    opts: ['Cursor / Claude Code', 'Lovable / Bolt', 'A bit of everything'].map((l) => o(l, to('recKit'))),
  },
  ask: { say: 'Type it below in your own words — your app, AI visibility, privacy, pricing, anything.', opts: [o('Back to start', to('start'))] },
  contact: {
    say: 'That one’s for Anadi himself. Leave your email and I’ll open a ticket with what you told me. He reads every request.',
    opts: [o('Back to start', to('start'))],
  },
  recProd: { opts: [tour, startOver] },
  recVis: { opts: [tour, startOver] },
  recDpdp: { opts: [tour, startOver] },
  recAi: { opts: [tour, startOver] },
  recKit: { opts: [startOver, o('Show me the free stuff', to('free'))] },
  blog: {
    say: 'Anadi writes up what he finds in real apps. Pick a topic and I’ll take you to those posts.',
    opts: (
      [
        ['Show me everything', 'All'],
        ['Production', 'Production'],
        ['AI visibility', 'AI visibility'],
        ['Privacy', 'Privacy'],
      ] as const
    ).map(([l, topic]) => o(l, { section: 'blog', event: { name: 'bq:blog', detail: topic } })),
  },
  hunt: {
    say: 'Deal: Anadi finds the first bug in your app — free, on video, within 24 hours. Four quick taps so his time goes where it helps most.',
    opts: [o('Let’s go', to('q1')), o('Maybe later', to('start'))],
  },
  q1: { say: 'Is your app live, or launching within 30 days?', key: 'live', opts: ['Live now', 'Launching within 30 days', 'Just an idea for now'].map((l) => o(l, to('q2'))) },
  q2: { say: 'Who uses it?', key: 'users', opts: ['Paying customers', 'Real users or a client', 'Only me and friends'].map((l) => o(l, to('q3'))) },
  q3: { say: 'What happens if it breaks?', key: 'impact', opts: ['We lose money or users', 'It’s embarrassing', 'Nothing much'].map((l) => o(l, to('q4'))) },
  q4: { say: 'When do you want it fixed?', key: 'when', opts: ['This week', 'This month', 'Someday'].map((l) => o(l, { qcheck: true })) },
  qurl: {
    say: 'You qualify. Tell me where to send the video and which app to look at, and I’ll open a ticket for Anadi.',
    opts: [o('Back to start', to('start'))],
  },
  notyet: {
    say: 'Honest answer: the free bug review is for apps with real users, so Anadi’s five weekly slots go where they help most. Here’s what fits you right now:',
    opts: [
      o('Take the Wrapper Test', { href: '/teardown' }),
      o('Do it myself with the Kit', to('kit')),
      o('Book a $349 audit anyway', { href: mailto('Book the $349 production audit', {}) }),
      o('Back to start', to('start')),
    ],
  },
  ai: {
    say: 'Nice. What do you want AI to do?',
    key: 'aiwant',
    opts: ['Answer questions from our data', 'Automate a workflow or agent', 'A Bit-style guide for our site', 'Fix an AI feature we already have'].map((l) => o(l, to('ai2'))),
  },
  ai2: { say: 'Is the product live?', key: 'aistage', opts: ['Live with users', 'Still building'].map((l) => o(l, to('ai3'))) },
  ai3: { say: 'Optional: roughly what budget do you have in mind? I won’t quote from it — Anadi confirms a fixed price after the free first-bug video.', key: 'budget', opts: BUDGET.map((l) => o(l, to('recAi'))) },
  care: {
    say: 'Care keeps a live app healthy: monitoring, a monthly review and small fixes — $299/mo, month to month. Search visibility and privacy are re-checked every quarter.',
    opts: [o('Start Care', { href: mailto('Care plan', {}) }), o('Find my first bug first', to('hunt')), o('Back to start', to('start'))],
  },
};

/** Three of four strong answers to the qualification questions → the free review; otherwise the honest "not yet". */
export function qualify(ans: Answers): 'qurl' | 'notyet' {
  let good = 0;
  if (/Live now|Launching/.test(ans.live ?? '')) good++;
  if (/Paying|Real users/.test(ans.users ?? '')) good++;
  if (/lose money|embarrassing/.test(ans.impact ?? '')) good++;
  if (/This week|This month/.test(ans.when ?? '')) good++;
  return good >= 3 ? 'qurl' : 'notyet';
}

const pkgActions = (subject: string, ans: Answers, symptoms: number[] = []): Option[] => [
  o('Find my first bug — free', { href: firstBug(symptoms) }),
  o('Email Anadi my answers', { href: mailto(subject, ans) }),
  tour,
];

/** What Bit says on arriving at a node, including recommendations built from the answers so far. */
export function reply(id: NodeId, ans: Answers): Message[] {
  if (id === 'recProd') {
    const one = ans.scope === 'One specific thing';
    const notes = [`Built with ${ans.stack ?? 'your stack'} — Anadi knows where those apps usually break.`];
    notes.push(one ? 'One specific issue usually lands at the lower end of the range.' : 'Several issues at once? The sprint covers up to three problem areas in a week.');
    if (ans.live === 'Yes, 100+ users') notes.push('With 100+ users live, add Care ($299/mo) so it stays fixed.');
    if (ans.live === 'Not yet — launching soon') notes.push('Launching soon — let’s catch the problems before your users do.');
    notes.push('Path: free first-bug video → $349 audit (credited) → fixed price, half paid when it’s live.');
    const symptoms = ans.live === 'Not yet — launching soon' ? [5] : [];
    return [
      { who: 'bit', text: 'Here’s what I’d do:' },
      { who: 'rec', rec: { title: 'Launch-ready sprint', price: '$1,500–$2,500', notes, actions: pkgActions('Launch-ready sprint', ans, symptoms) } },
    ];
  }
  if (id === 'recVis') {
    const notes: string[] = [];
    if (ans.js === 'Yes' || ans.js === 'Not sure') notes.push('JavaScript apps often show AI crawlers an empty page — the first thing Anadi checks.');
    notes.push(ans.asked === 'Not yet' ? 'Not checked yet? The free review includes a quick AI-answer check.' : 'Missing from answers means models can’t find, read or trust you yet.');
    notes.push('Search & AI visibility is one of the three areas every audit covers.');
    return [
      { who: 'bit', text: 'Sounds like an AI visibility problem:' },
      { who: 'rec', rec: { title: 'Production audit', price: '$349 · credited to the fix', notes, actions: pkgActions('Production audit (AI visibility)', ans, [4]) } },
    ];
  }
  if (id === 'recDpdp') {
    const notes: string[] = [];
    if (ans.consent === 'Pre-ticked box, or no consent') notes.push('A pre-ticked box isn’t consent under GDPR, CCPA or DPDP — that’s the first thing to fix.');
    if (ans.pd === 'Not sure') notes.push('Not sure what you collect? The audit starts with a data inventory.');
    notes.push('Consent, notices, deletion requests and breach readiness — fixed in code, not a PDF.');
    notes.push('Privacy & compliance is one of the three areas every audit covers.');
    return [
      { who: 'bit', text: 'This one’s a privacy question:' },
      { who: 'rec', rec: { title: 'Production audit', price: '$349 · credited to the fix', notes, actions: pkgActions('Production audit (privacy)', ans) } },
    ];
  }
  if (id === 'recAi') {
    const fixing = /Fix an AI/.test(ans.aiwant ?? '');
    const live = ans.aistage === 'Live with users';
    const notes = [
      'Fixed price after a short scoping call — no hourly billing.',
      'Guardrails, fallbacks and cost limits are built in, not extras.',
      live ? 'Live already? Anadi ships it behind a switch, so your users never see a half-built feature.' : 'Still building? Anadi shapes the AI part so it’s cheap to run from day one.',
    ];
    const title = fixing ? 'Production audit' : 'AI build';
    return [
      { who: 'bit', text: 'Here’s what fits:' },
      {
        who: 'rec',
        rec: {
          title,
          price: fixing ? '$349 · AI checks included' : '$2,000–$8,000',
          notes,
          actions: [o('Get a fixed quote', { href: mailto(`${title} quote`, ans) }), o('See Build with AI pricing', { section: 'pricing' }), tour],
        },
      },
    ];
  }
  if (id === 'recKit') {
    const title = ans.kitTool === 'A bit of everything' ? 'Production Kit — full bundle' : `Production Kit — ${ans.kitTool ?? 'your'} pack`;
    return [
      { who: 'bit', text: 'For you, I’d start here:' },
      {
        who: 'rec',
        rec: {
          title,
          price: 'Free download',
          notes: ['The same rules and checklists Anadi uses on client apps.', 'Want him to do it instead? Start with the free first-bug video.'],
          actions: [o('Get the free kit', { href: '/products/production-kit' }), o('Have Anadi fix it', to('prod')), tour],
        },
      },
    ];
  }
  const n = NODES[id];
  const out: Message[] = n.say ? [{ who: 'bit', text: n.say }] : [];
  if (id === 'free') {
    out.push({
      who: 'links',
      links: [
        o('First-bug video — free, within 24h', { href: FIRST_BUG }),
        o('The Wrapper Test — 13 questions', { href: '/teardown' }),
        o('The audit checklist', { section: 'checks' }),
        o('The Production Kit', { href: '/products/production-kit' }),
      ],
    });
  }
  // The form's own fallback links (first-bug form, email) sit under the form and replace it if saving fails.
  if (id === 'qurl') out.push({ who: 'form', kind: 'first_bug' });
  if (id === 'contact') out.push({ who: 'form', kind: 'question' });
  return out;
}

/** Free-text routing: the first matching topic wins; anything unrecognised goes to Anadi. */
const ROUTES: [RegExp, NodeId | 'tour', string][] = [
  [/tour|show me around|explore|look around/, 'tour', 'Sure — let’s take a walk.'],
  [/dpdp|consent|privacy|personal data|gdpr|complian|cookie|delete/, 'dpdp', 'That’s a privacy question — two quick taps and I’ll point you right.'],
  [/add ai|ai feature|chatbot|agent|automat|\brag\b|llm|assistant|openai|ai model|copilot/, 'ai', 'You want AI in your product — two quick questions:'],
  [/maintain|maintenance|retainer|monitor|care plan|ongoing|look after/, 'care', 'Ongoing care — here’s how it works:'],
  [/chatgpt|perplexity|gemini|claude|\bai\b|seo|cited|citation|visib|google|rank|llms/, 'vis', 'Sounds like AI visibility. Two quick questions:'],
  [/wrapper|teardown|defensib/, 'teardown', 'You’re after the Wrapper Test or the teardown:'],
  [/kit|rules|checklist|template|diy|myself/, 'kit', 'Doing it yourself? That’s what the Production Kit is for.'],
  [/blog|post|article|read/, 'blog', 'Here are Anadi’s field notes:'],
  [/price|cost|budget|package|quote|how much|cheap/, 'start', 'Prices are fixed and public — the pricing table has all six. Or tell me what’s going on:'],
  [/free|tool|test|try/, 'free', 'Free things first — smart.'],
  [/bug|broke|break|crash|auth|login|supabase|firebase|deploy|slow|launch|lovable|cursor|bolt|v0|error|leak|security|hack/, 'prod', 'Sounds like a production problem. A few quick taps:'],
];

export function classify(q: string): { node: NodeId | 'tour'; say: string } {
  const s = q.toLowerCase();
  for (const [re, node, say] of ROUTES) if (re.test(s)) return { node, say };
  return { node: 'contact', say: 'Good question — that one’s for Anadi himself.' };
}

export type ChatState = { node: NodeId; ans: Answers; log: Message[] };

export const initial = (): ChatState => ({ node: 'start', ans: {}, log: reply('start', {}) });

/**
 * Apply a tapped option. Returns the next state, or `null` when the option
 * leaves the chat (a link or a page section), which the component handles.
 */
export function choose(state: ChatState, opt: Option): ChatState | null {
  if ('href' in opt.to || 'section' in opt.to) return null;
  const cur = NODES[state.node];
  let ans = { ...state.ans };
  if (cur.key) ans[cur.key] = opt.label;
  const next: NodeId = 'qcheck' in opt.to ? qualify(ans) : opt.to.node;
  if (next === 'start') ans = {};
  const log: Message[] = [...state.log, { who: 'you', text: opt.label }, ...reply(next, ans)];
  return { node: next, ans, log };
}

/** Apply free text typed into the chat. `tour` is returned for the component to start the tour. */
export function ask(state: ChatState, text: string): ChatState | 'tour' {
  const q = text.trim();
  if (!q) return state;
  const c = classify(q);
  if (c.node === 'tour') return 'tour';
  const body = c.node === 'contact' || c.node === 'start' ? reply(c.node, state.ans).filter((m) => m.who !== 'bit') : reply(c.node, state.ans);
  return { node: c.node, ans: state.ans, log: [...state.log, { who: 'you', text: q }, { who: 'bit', text: c.say }, ...body] };
}

/** The options to show under the last message. */
export const optionsFor = (node: NodeId): Option[] => NODES[node].opts;
