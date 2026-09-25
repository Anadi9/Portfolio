/**
 * The business details the policy pages publish. Stripe India requires the
 * registered address and a domestic phone number on the support page, and its
 * reviewers compare them against the account, so they live in one place.
 */
export const BUSINESS = {
  /** Legal name of the sole proprietor, as on the Stripe account. */
  legalName: 'Anadi Thakur',
  /** Registered address, one line per entry. */
  address: ['TODO: street address', 'TODO: city, state, PIN code', 'India'],
  /** City whose courts have jurisdiction: the one in the address above. */
  jurisdiction: 'TODO: city',
  phone: '+91 74669 14279',
  phoneHref: 'tel:+917466914279',
  email: 'anadithakur99@gmail.com',
  /** Must match the refund promise on the kit's sales page. */
  refundDays: 14,
  /** Shown as "Last updated" on every policy page. */
  updated: '25 September 2026',
} as const;

export const LEGAL_PATHS = {
  support: '/support',
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',
} as const;
