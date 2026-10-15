import { Seo } from '@/components/Seo';
import { ServicePage, type ServicePageProps } from '@/components/home/ServicePage';
import { offers, QUOTE_CARE } from '@/data/bitsQuest';
import { breadcrumbs, faqPage, graph, service } from '@/lib/schema';

/**
 * `/care`: the Keep it running service (Care plan, $299/mo). Copy from the
 * Bit's Quest services card, pricing group and Bit's care node.
 */

const PATH = '/care';
const URL = `https://anadithakur.in${PATH}`;
const TITLE = 'Care plan: a senior engineer for your live app, $299/mo · Anadi Thakur';
const DESCRIPTION =
  'Keep your live app fast, safe and found: monitoring, a monthly health review, small fixes, and a quarterly search-visibility and privacy re-check. $299/mo, cancel anytime.';

const content: ServicePageProps = {
  page: 'care',
  icon: 'shield',
  pose: 'ready',
  eyebrow: 'Keep it running',
  title: 'Keep it fast, safe and found.',
  lead: 'Your product is live and you want a senior engineer watching it — and buyers and AI search finding it.',
  primary: { text: 'Start Care', href: QUOTE_CARE },
  included: {
    title: 'What’s included.',
    items: [
      ['Monitoring and a monthly health review', 'Errors, speed and uptime watched, and a plain-English review every month.'],
      ['Small fixes and upgrades every month', 'The small things that pile up, handled before they turn into big ones.'],
      ['Quarterly search-visibility re-check', 'Can Google and AI assistants still read, find and recommend you?'],
      ['Quarterly privacy check', 'Consent, notices and data requests checked against GDPR, CCPA and DPDP.'],
    ],
  },
  packages: [{ name: 'Care plan', duration: 'Monthly', price: '$299/mo', detail: 'Monitoring, a monthly health review and small fixes included.' }],
  terms: ['Month to month', 'Cancel anytime', 'Priority response when something breaks', 'Quarterly visibility and privacy re-check'],
  steps: [
    { title: 'Start', body: 'Email Anadi your app link. Care starts with a first health review.' },
    { title: 'Every month', body: 'Monitoring, a health review and small fixes, written up in plain English.' },
    { title: 'Every quarter', body: 'Search & AI visibility and privacy re-checked, with what changed.' },
    { title: 'When it breaks', body: 'Priority response. Bigger work gets a fixed quote before it starts.' },
  ],
  faq: [
    { q: 'What does it cost?', a: '$299 a month, month to month. Cancel anytime.' },
    { q: 'Do I need a fix first?', a: 'Not required. Many clients start Care right after a fix. If you’re not sure the app is stable, start with the free first-bug video.' },
    { q: 'What does the quarterly re-check cover?', a: 'Search & AI visibility (can Google and AI assistants read and recommend you) and privacy & compliance (consent, notices, data requests under GDPR, CCPA and India’s DPDP Act).' },
    { q: 'What happens with bigger work?', a: 'Anything beyond small fixes gets a fixed quote before it starts, at the same fixed prices as the rest of the site.' },
  ],
  closing: { title: 'Keep a senior engineer on guard.', body: '$299/mo, month to month. Priority response when something breaks.' },
};

const jsonLd = graph([
  service({
    path: PATH,
    name: 'Care plan',
    description: DESCRIPTION,
    serviceType: 'Application maintenance',
    areaServed: ['Worldwide'],
    offers: offers.care,
  }),
  faqPage(content.faq, `${URL}#faq`),
  breadcrumbs([{ name: 'Care plan', path: PATH }], `${URL}#breadcrumb`),
]);

const Care = () => (
  <>
    <Seo title={TITLE} description={DESCRIPTION} path={PATH} type="website" jsonLd={jsonLd} />
    <ServicePage {...content} />
  </>
);

export default Care;
