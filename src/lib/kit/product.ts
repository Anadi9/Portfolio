/**
 * The Production Kit: the one thing the page, the checkout and the delivery all
 * have to agree on. The price lives here and nowhere else; the checkout sends it
 * to Stripe inline, so there is no Stripe-side Price to drift out of step with
 * what the page says.
 */
export const KIT = {
  /** Stamped on the Checkout Session as `metadata.product`; delivery refuses anything else. */
  id: 'production-kit',
  name: 'The Production Kit',
  /** Minor units, as Stripe wants them. */
  amount: 1900,
  currency: 'usd',
  path: '/products/production-kit',
  thanksPath: '/products/production-kit/thanks',
  /** Name of the downloaded archive, and the folder inside it. */
  archive: 'production-kit',
} as const;

export const kitPrice = `$${(KIT.amount / 100).toFixed(KIT.amount % 100 ? 2 : 0)}`;

export const downloadUrl = (origin: string, sessionId: string) =>
  `${origin}/api/production-kit-download?session_id=${encodeURIComponent(sessionId)}`;
