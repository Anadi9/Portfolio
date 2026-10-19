import { Head } from 'vite-react-ssg';
import jerseyLatin from '@fontsource/jersey-10/files/jersey-10-latin-400-normal.woff2?url';
import spaceGroteskLatin from '@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2?url';

/** Canonical origin. Every notes URL is absolute against this; see `Seo`. */
export const ORIGIN = 'https://anadithakur.in';

/** The portfolio's own host, which serves `/portfolio` as its root (`worker/host.ts`; `middleware.ts` on Vercel). */
export const PORTFOLIO_ORIGIN = 'https://portfolio.anadithakur.in';

/**
 * Default `robots` for main-site pages. `max-snippet:-1` lifts Google's cap on
 * snippet length, which otherwise limits featured-snippet and AI-overview
 * extraction. It lives here rather than in `index.html` because the portfolio
 * host shares that file and must render exactly as before.
 */
export const DEFAULT_ROBOTS = 'index,follow,max-snippet:-1,max-image-preview:large,max-video-preview:-1';

export const BYLINE = '@the.anadi';

/**
 * Bit's Quest fonts are self-hosted (Fontsource, imported in main.tsx). The two the
 * first screen needs are preloaded on main-site pages so the hero's display type
 * doesn't wait for the stylesheet; the portfolio keeps `index.html`'s set.
 */
export const BRAND_FONT_PRELOADS = [jerseyLatin, spaceGroteskLatin];

/**
 * Bit favicons and brand fonts, for every main-site page (the 404 calls it too).
 * An array of plain tags, because Helmet rejects components and fragments as children.
 */
export const brandHeadTags = () => [
  ...BRAND_FONT_PRELOADS.map((href) => <link key={`bq-font-${href}`} rel="preload" as="font" type="font/woff2" href={href} crossOrigin="anonymous" />),
  <link key="bq-icon" rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />,
  <link key="bq-icon32" rel="icon" href="/brand/favicon-32.png" sizes="32x32" type="image/png" />,
  <link key="bq-apple" rel="apple-touch-icon" href="/brand/apple-touch-icon.png" />,
  <meta key="bq-theme" name="theme-color" content="#fafafa" />,
];
/**
 * Per-page head. Every route owns its own, and `index.html` deliberately carries
 * no title or description, because a static one there and a rendered one here
 * both end up in the same `<head>` and a crawler has to pick.
 *
 * Notes routes are the only prerendered pages that expect to be found by search
 * rather than by someone who already knows the name, so canonical, description
 * and an absolute OG image are not optional here the way they are on `/`.
 */
export const Seo = ({
  title,
  description,
  path,
  type = 'article',
  image,
  robots,
  jsonLd,
  origin = ORIGIN,
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article' | 'blog';
  /** Root-relative; made absolute here, because Twitter won't take anything else. Defaults to the site's card for the host. */
  image?: string;
  /**
   * Only set by pages that should be shareable but not indexed. The result
   * pages are forty near-duplicates of one another, which on a corpus this
   * small is the thin content that dilutes the pages worth finding — but they
   * still have to pass their link equity on, hence `follow` rather than `none`.
   */
  robots?: string;
  jsonLd?: Record<string, unknown>;
  /** The host `path` is canonical on. Only the portfolio, which lives on its own subdomain, sets it. */
  origin?: string;
}) => {
  const url = `${origin}${path}`;
  // Main-site pages get Bit's icons and fonts; the portfolio (its own origin) is left exactly as it was.
  const brand = origin === ORIGIN;
  const card = image ?? (brand ? '/og-brand.png' : '/og.png');
  const img = card.startsWith('http') ? card : `${ORIGIN}${card}`;
  return (
    <Head>
      {brand && brandHeadTags()}
      <title>{title}</title>
      <meta name="description" content={description} />
      {(robots ?? (brand ? DEFAULT_ROBOTS : undefined)) && (
        <meta name="robots" content={robots ?? DEFAULT_ROBOTS} />
      )}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
      {/* `index.html` declares `image/png` for the site-wide card. The per-post
          cards are JPEGs, and a route that overrides the image has to override
          the type with it or the two tags disagree. */}
      <meta property="og:image:type" content={img.endsWith('.jpg') ? 'image/jpeg' : 'image/png'} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={img} />
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Head>
  );
};
