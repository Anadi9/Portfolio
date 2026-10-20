/**
 * The business details the policy pages publish (registered address and a
 * domestic phone number on the support page), in one place.
 */
export const BUSINESS = {
  /** Legal name of the sole proprietor. */
  legalName: 'Anadi Thakur',
  /** Registered address, one line per entry. */
  address: ['TODO: street address', 'TODO: city, state, PIN code', 'India'],
  /** City whose courts have jurisdiction: the one in the address above. */
  jurisdiction: 'TODO: city',
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
