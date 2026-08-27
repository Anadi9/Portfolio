import { Head } from 'vite-react-ssg';

/** Canonical origin. Every notes URL is absolute against this — see `Seo`. */
export const ORIGIN = 'https://anadithakur.in';

export const BYLINE = '@the.anadi';

/**
 * Per-page head. Every route owns its own — `index.html` deliberately carries
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
  jsonLd,
}: {
  title: string;
  description: string;
  path: string;
  type?: 'website' | 'article' | 'blog';
  /** Root-relative; made absolute here, because Twitter won't take anything else. */
  image?: string;
  jsonLd?: Record<string, unknown>;
}) => {
  const url = `${ORIGIN}${path}`;
  const img = image.startsWith('http') ? image : `${ORIGIN}${image}`;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />
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
