/**
 * The site header's menus (`components/site/SiteNav.tsx`): Services and Free
 * tools as mega panels, Resources as a list with a detail pane (its posts come
 * from `nav.generated.ts`), Meet us as a short list, Pricing as a plain link.
 * The phone drill-down reads the same arrays, so the two can't drift apart.
 */
import { NAV_POSTS } from './nav.generated';

export type NavIcon = 'rocket' | 'lens' | 'lock' | 'spark' | 'shield' | 'video' | 'doc';
export type NavLink = { title: string; desc: string; href: string; icon?: NavIcon };
export type NavColumn = { heading: string; links: NavLink[] };
export type NavFeature = { eyebrow: string; title: string; body: string; cta: { text: string; href: string }; dark?: boolean };

export const FIRST_BUG = '/audit?type=app';
export const TALK_TO_BIT = '/?bit=1';

export const SERVICES_MENU: { columns: NavColumn[]; feature: NavFeature; strip: { text: string; link: { text: string; href: string } } } = {
  columns: [
    {
      heading: 'Fix & launch',
      links: [
        { title: 'Production ready', desc: 'Fix what’s breaking, or get launch-ready', href: '/production-ready', icon: 'rocket' },
        { title: 'AI visibility', desc: 'Be found by Google and AI assistants', href: '/ai-visibility', icon: 'lens' },
        { title: 'Privacy & compliance', desc: 'GDPR, CCPA and India’s DPDP: consent, notices, data requests', href: '/dpdp', icon: 'lock' },
      ],
    },
    {
      heading: 'Build & keep',
      links: [
        { title: 'Build with AI', desc: 'Assistants, search and automations, with guardrails', href: '/build-with-ai', icon: 'spark' },
        { title: 'Care plan', desc: 'Monitoring and monthly fixes for a live app', href: '/care', icon: 'shield' },
      ],
    },
  ],
  feature: {
    eyebrow: 'Free · start here',
    title: 'Your first bug, found free',
    body: 'A short video of the biggest risk in your app, within 24 hours.',
    cta: { text: 'Find my first bug', href: FIRST_BUG },
    dark: true,
  },
  strip: { text: 'Production audit $349 · everything else gets one fixed quote.', link: { text: 'See pricing →', href: '/#pricing' } },
};

export const TOOLS_MENU: { columns: NavColumn[]; feature: NavFeature } = {
  columns: [
    {
      heading: 'For your app',
      links: [
        { title: 'First-bug review', desc: 'Your biggest risk, on video, within 24 hours', href: FIRST_BUG, icon: 'video' },
        { title: 'AI readiness checker', desc: 'Can AI crawlers read your site?', href: '/ai-readiness', icon: 'lens' },
      ],
    },
    {
      heading: 'For your product',
      links: [
        { title: 'The Wrapper Test', desc: '13 questions: is your AI product defensible?', href: '/teardown', icon: 'spark' },
        { title: 'Privacy self-check', desc: 'How ready is your app for privacy law?', href: '/dpdp/check', icon: 'lock' },
        { title: 'The Production Kit', desc: 'Rules and checklists for AI coding tools. Free download', href: '/products/production-kit', icon: 'doc' },
      ],
    },
  ],
  feature: {
    eyebrow: 'Not sure which?',
    title: 'Bit picks the right check in four taps',
    body: 'No sign-up. Every tool on this list is free.',
    cta: { text: 'Talk to Bit', href: TALK_TO_BIT },
  },
};

export type ResourceKey = keyof typeof NAV_POSTS;

export const RESOURCES_MENU: { key: ResourceKey; title: string; blurb: string; all: string }[] = [
  { key: 'fix', title: 'Fixes', blurb: 'What breaks in apps built fast, and how to fix it.', all: 'All fixes →' },
  { key: 'wisdom', title: 'Wisdom', blurb: 'Guides for founders: visibility, privacy and shipping.', all: 'All wisdom →' },
  { key: 'dispatch', title: 'Dispatch', blurb: 'AI news, read for what it means for your product.', all: 'All dispatches →' },
  { key: 'drop', title: 'Drops', blurb: 'Free templates and guides you can use today.', all: 'All drops →' },
];

export const MEET_MENU: NavLink[] = [
  { title: 'Anadi & Bit', desc: 'The engineer who does the work, the assistant who takes your request, and the portfolio', href: '/about' },
  { title: 'How it works', desc: 'From first message to live', href: '/#quest' },
];

export const PRICING_HREF = '/#pricing';
export const CLIENT_LOGIN_HREF = '/portal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** "2026-09-24" → "24 Sep 2026", without `Intl`, so the prerender and the browser agree. */
export const navDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export { NAV_POSTS };
