/**
 * The business details the policy pages publish (registered address and a
 * domestic phone number on the support page), in one place.
 */
export const BUSINESS = {
  /** Legal name of the sole proprietor. */
  legalName: 'Anadi Thakur',
  /** Registered address, one line per entry. */
  address: ['142/18, Street 3B, Friends Colony', 'Gurugram 122001', 'India'],
  /** The same address in parts, for the structured data (`lib/schema.ts`). */
  postal: { street: '142/18, Street 3B, Friends Colony', locality: 'Gurugram', postalCode: '122001', country: 'IN' },
  /** City whose courts have jurisdiction: the one in the address above. */
  jurisdiction: 'Gurugram',
  phone: '+91 74669 14279',
  phoneHref: 'tel:+917466914279',
  email: 'anadithakur99@gmail.com',
  /** Shown as "Last updated" on every policy page. */
  updated: '20 October 2026',
} as const;

export const LEGAL_PATHS = {
  support: '/support',
  terms: '/terms',
  privacy: '/privacy',
} as const;
