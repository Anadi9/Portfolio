import { ORIGIN, PORTFOLIO_ORIGIN } from '@/components/Seo';
import { site } from '@/data/portfolio';

/**
 * The site's entities, defined once.
 *
 * Answer engines decide who someone is by joining every mention of them into
 * one entity, and two pages describing the same person with different names,
 * roles or `@id`s read as two people. So every page refers to these two nodes
 * by `@id` and only the hub carries them in full.
 *
 * The Person `@id` predates this module (every note's author already points at
 * it), so it stays on the portfolio host rather than moving.
 */
export const PERSON_ID = `${PORTFOLIO_ORIGIN}/#person`;
export const BUSINESS_ID = `${ORIGIN}/#business`;

/** One line, used verbatim wherever the business describes itself. Keep it identical everywhere. */
export const BUSINESS_TAGLINE =
  'AI visibility audits, DPDP readiness and production fixes for apps and software, by a full-stack engineer who builds every fix personally.';

export const PERSON = {
  '@type': 'Person',
  '@id': PERSON_ID,
  name: site.name,
  jobTitle: 'Full-stack engineer',
  url: PORTFOLIO_ORIGIN,
  email: `mailto:${site.email}`,
  sameAs: [site.github, site.linkedin],
  worksFor: { '@id': BUSINESS_ID },
  knowsAbout: [
    'Generative engine optimisation (GEO)',
    'Answer engine optimisation (AEO)',
    'AI visibility',
    'Structured data',
    'Technical SEO',
    "India's Digital Personal Data Protection Act (DPDP)",
    'Consent management',
    'React',
    'Next.js',
    'Node.js',
    'Supabase',
    'Lovable, Bolt and Cursor apps',
  ],
};

export const BUSINESS = {
  '@type': 'ProfessionalService',
  '@id': BUSINESS_ID,
  name: `${site.name} · AI-era readiness`,
  alternateName: site.name,
  description: BUSINESS_TAGLINE,
  url: `${ORIGIN}/`,
  image: `${ORIGIN}/og.png`,
  email: site.email,
  founder: { '@id': PERSON_ID },
  employee: { '@id': PERSON_ID },
  address: { '@type': 'PostalAddress', addressCountry: 'IN' },
  areaServed: [
    { '@type': 'Country', name: 'India' },
    { '@type': 'Country', name: 'United States' },
    { '@type': 'Place', name: 'Worldwide' },
  ],
  knowsAbout: ['AI visibility', 'GEO', 'AEO', 'DPDP compliance', 'Production engineering'],
  sameAs: [site.linkedin, site.github],
};

export const PERSON_REF = { '@id': PERSON_ID };
export const BUSINESS_REF = { '@id': BUSINESS_ID };

export type Crumb = { name: string; path: string };

/** `BreadcrumbList` from root-relative paths. Home is prepended. */
export const breadcrumbs = (trail: Crumb[], id?: string) => ({
  '@type': 'BreadcrumbList',
  ...(id ? { '@id': id } : {}),
  itemListElement: [{ name: 'Home', path: '/' }, ...trail].map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: `${ORIGIN}${c.path === '/' ? '/' : c.path}`,
  })),
});

export type Faq = { q: string; a: string };

export const faqPage = (faqs: Faq[], id: string) => ({
  '@type': 'FAQPage',
  '@id': id,
  mainEntity: faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
});

export type PricedOffer = {
  name: string;
  description: string;
  /** Lower bound; `0` for a free tier. */
  min: number;
  max?: number;
  currency: 'USD' | 'INR';
  monthly?: boolean;
};

const offer = (o: PricedOffer, url: string) => ({
  '@type': 'Offer',
  name: o.name,
  description: o.description,
  url,
  priceSpecification: {
    '@type': o.monthly ? 'UnitPriceSpecification' : 'PriceSpecification',
    minPrice: o.min,
    ...(o.max === undefined ? {} : { maxPrice: o.max }),
    priceCurrency: o.currency,
    ...(o.monthly ? { unitText: 'MONTH' } : {}),
  },
});

/** A `Service` the business provides, with its offers. */
export const service = ({
  path,
  name,
  description,
  serviceType,
  offers = [],
  areaServed,
}: {
  path: string;
  name: string;
  description: string;
  serviceType: string;
  offers?: PricedOffer[];
  areaServed?: string[];
}) => {
  const url = `${ORIGIN}${path}`;
  return {
    '@type': 'Service',
    '@id': `${url}#service`,
    name,
    description,
    serviceType,
    url,
    provider: BUSINESS_REF,
    ...(areaServed ? { areaServed: areaServed.map((n) => ({ '@type': 'Place', name: n })) } : {}),
    ...(offers.length ? { offers: offers.map((o) => offer(o, url)) } : {}),
  };
};

/** Wraps nodes in one graph. The two entity nodes go in only where `withEntities` is set (the hub). */
export const graph = (nodes: Record<string, unknown>[], withEntities = false) => ({
  '@context': 'https://schema.org',
  '@graph': [...(withEntities ? [BUSINESS, PERSON] : []), ...nodes],
});
