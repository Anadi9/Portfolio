import { Head } from 'vite-react-ssg';

/** Canonical origin. Every notes URL is absolute against this; see `Seo`. */
export const ORIGIN = 'https://anadithakur.in';

/** The portfolio's own host. `vercel.json` serves `/portfolio` as its root. */
export const PORTFOLIO_ORIGIN = 'https://portfolio.anadithakur.in';

export const BYLINE = '@the.anadi';

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
  image = '/og.png',
  robots,
  jsonLd,
  origin = ORIGIN,
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article' | 'blog';
  /** Root-relative; made absolute here, because Twitter won't take anything else. */
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
  const img = image.startsWith('http') ? image : `${ORIGIN}${image}`;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      {robots && <meta name="robots" content={robots} />}
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
